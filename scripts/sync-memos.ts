#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { parseSyncArgs } from "./lib/cli";
import { contentFingerprint } from "./lib/fingerprint";
import { toPublicAssetUrl, r2Bucket, r2PublicDomain } from "./lib/asset-url";
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

/**
 * 允许「内容真的消失」的比例上限。
 *
 * 超过这个比例基本可以确定不是用户正常删几条，而是上游查询坏了
 * （token 失效、数据库被清、visibility 被批量改）。此时保留旧快照更安全。
 */
const MAX_GONE_RATIO = 0.5;

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

/**
 * 附件的 externalLink 由 Memos 的 S3 后端签发，是**几天后就会过期**的预签名
 * 链接。本站是静态导出，链接会被固化进 markdown 快照，必须在这里改写为
 * 公开域名，否则快照里的图片会在签名过期后集体 403（详见 lib/asset-url.ts）。
 */
function normalizeMemo(memo: Memo): Memo {
  const options = { publicDomain: r2PublicDomain(), bucket: r2Bucket() };
  return {
    ...memo,
    attachments: (memo.attachments ?? []).map((attachment) => ({
      ...attachment,
      externalLink: toPublicAssetUrl(attachment.externalLink, options),
    })),
  };
}

function buildFrontmatter(input: Memo): string {
  const memo = normalizeMemo(input);
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

/**
 * 从已落盘的文件里读内容指纹：frontmatter 的 date + 正文。
 *
 * 不读 slug——正是因为 slug 会变才需要这套判断。格式不符（老文件、手工改过）
 * 时返回 null，这类文件按「内容真的不在了」处理，宁可保守。
 */
function fingerprintOfFile(file: string): string | null {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
    if (!match) return null;
    const date = /^date:\s*"([^"]*)"/m.exec(match[1])?.[1];
    if (date == null) return null;
    return contentFingerprint(date, match[2]);
  } catch {
    return null;
  }
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
  force = false,
): { updated: number; deleted: number } {
  ensureDir(OUTPUT_DIR);

  const live = new Set<string>();
  const liveFingerprints = new Set<string>();
  let written = 0;
  for (const memo of memos) {
    const slug = memo.name.replace(/^memos\//, "");
    live.add(slug);
    liveFingerprints.add(contentFingerprint(memo.createTime, memo.content));
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

  const diskFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((file) => file.endsWith(".md"));
  const orphans = diskFiles.filter((file) => !live.has(file.replace(/\.md$/, "")));
  if (orphans.length === 0) return { updated: written, deleted: 0 };

  // 孤儿分两类：uid 变了但内容还在（实例重建），和内容真的不在了（用户删除）。
  // 前者删掉是安全的——同样的内容已经写进新文件；后者才是需要警惕的缩水。
  const renamed: string[] = [];
  const gone: string[] = [];
  for (const file of orphans) {
    const fingerprint = fingerprintOfFile(path.join(OUTPUT_DIR, file));
    if (fingerprint && liveFingerprints.has(fingerprint)) renamed.push(file);
    else gone.push(file);
  }

  // 真消失的比例过高，通常是上游查询出问题（而不是用户一次删了半个站），
  // 保留现有快照、让人先看一眼；确认无误可用 --force 放行。
  const goneRatio = diskFiles.length > 0 ? gone.length / diskFiles.length : 0;
  if (gone.length > 0 && goneRatio > MAX_GONE_RATIO && !force) {
    throw new Error(
      `拒绝删除 ${gone.length}/${diskFiles.length} 条碎碎念（${Math.round(goneRatio * 100)}%）` +
        `——其中只有 ${renamed.length} 条属于 uid 变化、内容仍在。` +
        `请先确认 Memos 是否正常；确认无误后加 --force 再跑一次。`,
    );
  }

  let deleted = 0;
  for (const file of [...renamed, ...gone]) {
    const isRenamed = renamed.includes(file);
    deleted++;
    if (dryRun) {
      console.log(
        `🔍 [dry-run] would delete ${isRenamed ? "旧 uid（内容已迁到新文件）" : "已下架"}: ${file}`,
      );
      continue;
    }
    fs.unlinkSync(path.join(OUTPUT_DIR, file));
    console.log(`🗑️  删除${isRenamed ? "旧 uid" : "已下架"}: ${file}`);
  }

  return { updated: written, deleted };
}

async function main() {
  const args = parseSyncArgs();
  // 本地调试专用开关：`SKIP_MEMOS_SYNC=1 pnpm build` 可以完全跳过网络请求。
  // 平时用 `pnpm build:local`（不触发 prebuild）就够，这个开关是给
  // 「必须跑完整 build 流程但不想等 Memos」的场景兜底的。
  if (process.env.SKIP_MEMOS_SYNC === "1") {
    console.log("⏭️  跳过 memos 同步（SKIP_MEMOS_SYNC=1），沿用 content/memos 现有快照");
    return;
  }
  if (args.dryRun) {
    console.log("🔍 DRY RUN — 不会写入或删除任何文件");
  }
  try {
    const memos = await fetchAll();
    console.log(`📚 共 ${memos.length} 条公开 Memos`);
    const { updated, deleted } = sync(memos, args.dryRun, args.force);
    console.log(`🎉 完成！写入=${updated}, 删除=${deleted}, 线上共=${memos.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`⚠️  sync-memos 失败（保留上次快照）: ${message}`);
    if (args.strict) process.exit(1);
  }
}

main();