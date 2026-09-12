#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const MEMOS_API =
  process.env.MEMOS_API || "https://memos.tius.cn/api/v1/memos";
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

interface Memo {
  name: string;
  content: string;
  createTime: string;
  tags: string[];
  pinned: boolean;
  state: string;
  visibility: string;
  attachments: MemoAttachment[];
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
    "---",
    "",
    memo.content.trimEnd(),
    "",
  ];
  return lines.join("\n");
}

async function fetchAll(): Promise<Memo[]> {
  const memos: Memo[] = [];
  let pageToken = "";

  do {
    const url = new URL(MEMOS_API);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

function sync(memos: Memo[]): { updated: number; deleted: number } {
  ensureDir(OUTPUT_DIR);

  const live = new Set<string>();
  for (const memo of memos) {
    const slug = memo.name.replace(/^memos\//, "");
    live.add(slug);
    const content = buildFrontmatter(memo);
    const file = path.join(OUTPUT_DIR, `${slug}.md`);
    if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === content) {
      continue;
    }
    fs.writeFileSync(file, content, "utf-8");
    console.log(`📝 已写 content/memos/${slug}.md`);
  }

  let deleted = 0;
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    if (!live.has(slug)) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
      deleted++;
      console.log(`🗑️  删除已下架: ${file}`);
    }
  }

  return { updated: live.size, deleted };
}

async function main() {
  const strict = process.argv.includes("--strict");
  try {
    const memos = await fetchAll();
    console.log(`📚 共 ${memos.length} 条公开 Memos`);
    const { updated, deleted } = sync(memos);
    console.log(`🎉 完成！memos=${updated}, deleted=${deleted}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`⚠️  sync-memos 失败（保留上次快照）: ${message}`);
    if (strict) process.exit(1);
  }
}

main();