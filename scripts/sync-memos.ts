#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { parseSyncArgs } from "./lib/cli";
import { loadEnv } from "./notion/utils";
import { withRetry } from "./lib/retry";

loadEnv();

// 注意：MEMOS_API 必须在 loadEnv() 之后读取。
// 本脚本在 prebuild 中作为独立进程运行（next build 之前），
// Next 的 .env.local 自动加载对它不生效——此前没有 loadEnv()，
// 导致 .env.local / .env 里的 MEMOS_API 在本地与 Cloudflare Pages 上被静默忽略。
const MEMOS_API = process.env.MEMOS_API || "https://memos.tius.cn/api/v1/memos";
const OUTPUT_DIR = path.join(process.cwd(), "content", "memos");
const PAGE_SIZE = 100;

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

interface MemoAttachment {
  name: string;
  filename: string;
  externalLink: string;
  type: string;
  size: string;
}

interface MemoLocation {
  placeholder: string;
  latitude: number;
  longitude: number;
}

interface Memo {
  name: string;
  content: string;
  createTime: string;
  tags: string[];
  pinned: boolean;
  state: string;
  visibility: string;
  attachments: MemoAttachment[];
  location?: MemoLocation;
}

const esc = (value: string): string => value.replace(/"/g, '\\"');

function buildFrontmatter(memo: Memo): string {
  const slug = memo.name.replace(/^memos\//, "");
  const lines = [
    "---",
    `slug: "${esc(slug)}"`,
    `date: "${memo.createTime}"`,
    `tags: ${JSON.stringify(memo.tags)}`,
    `pinned: ${memo.pinned}`,
    `attachments: ${JSON.stringify(memo.attachments)}`,
  ];
  if (memo.location) {
    lines.push(`location: ${JSON.stringify(memo.location)}`);
  }
  // 结尾 --- 与正文之间保留一个空行。此前用 lines.filter(l => l !== "")
  // 抹掉了它，gray-matter 虽能容忍，但不符合 frontmatter 的标准形态。
  lines.push("---", "", memo.content.trimEnd(), "");
  return lines.join("\n");
}

async function fetchAll(): Promise<Memo[]> {
  const memos: Memo[] = [];
  let pageToken = "";

  do {
    const url = new URL(MEMOS_API);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await withRetry(
      () =>
        fetch(url.toString(), {
          signal: AbortSignal.timeout(30_000),
          headers: { Accept: "application/json" },
        }),
      { label: "memos list" },
    );
    if (!res.ok) {
      // 带上 status，让 withRetry 能识别 5xx/429 并重试
      const err = new Error(`HTTP ${res.status} ${res.statusText}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }

    const data = (await res.json()) as {
      memos: Memo[];
      nextPageToken: string;
    };

    for (const memo of data.memos ?? []) {
      if (memo.state === "NORMAL" && memo.visibility === "PUBLIC") {
        memos.push(memo);
      }
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return memos;
}

function sync(
  memos: Memo[],
  dryRun: boolean,
): { updated: number; deleted: number } {
  ensureDir(OUTPUT_DIR);

  const live = new Set<string>();
  let written = 0;
  for (const memo of memos) {
    const slug = memo.name.replace(/^memos\//, "");
    live.add(slug);
    const content = buildFrontmatter(memo);
    const file = path.join(OUTPUT_DIR, `${slug}.md`);
    if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === content) {
      continue;
    }
    written++;
    if (dryRun) {
      console.log(`🔍 [dry-run] would write content/memos/${slug}.md`);
      continue;
    }
    fs.writeFileSync(file, content, "utf-8");
    console.log(`📝 已写 content/memos/${slug}.md`);
  }

  let deleted = 0;
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    if (live.has(slug)) continue;
    deleted++;
    if (dryRun) {
      console.log(`🔍 [dry-run] would delete 已下架: ${file}`);
      continue;
    }
    fs.unlinkSync(path.join(OUTPUT_DIR, file));
    console.log(`🗑️  删除已下架: ${file}`);
  }

  return { updated: written, deleted };
}

async function main() {
  const args = parseSyncArgs();
  if (args.dryRun) {
    console.log("🔍 DRY RUN — 不会写入或删除任何文件");
  }
  try {
    const memos = await fetchAll();
    console.log(`📚 共 ${memos.length} 条公开 Memos`);
    const { updated, deleted } = sync(memos, args.dryRun);
    console.log(`🎉 完成！写入=${updated}, 删除=${deleted}, 线上共=${memos.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`⚠️  sync-memos 失败（保留上次快照）: ${message}`);
    if (args.strict) process.exit(1);
  }
}

main();