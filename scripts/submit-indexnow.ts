#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./notion/utils";
import { withRetry } from "./lib/retry";

loadEnv();

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const PAGES_DIR = path.join(process.cwd(), "content", "pages");
const DEFAULT_SITE_URL = "https://tius.cn";

/**
 * 静态路由。与 src/app/sitemap.ts 的 staticRoutes 保持一致。
 * 注意：不要提交 301 重定向地址（如 /friends/，见 public/_redirects），
 * 搜索引擎需要的是最终落地页。
 */
const STATIC_PATHS = [
  "",
  "/archive/",
  "/blog/",
  "/categories/",
  "/columns/",
  "/memos/",
  "/search/",
  "/tags/",
  "/rss.xml",
];

/** 列出目录下所有 markdown 的 slug，跳过 _ 前缀（_placeholder.md 仅为构建占位）。 */
function slugsIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/, ""));
}

function buildUrlList(): string[] {
  const base = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

  const staticUrls = STATIC_PATHS.map((p) => `${base}${p}`);
  const postUrls = slugsIn(POSTS_DIR).map(
    (slug) => `${base}/posts/${encodeURIComponent(slug)}/`,
  );
  // pages 的 slug 来自 content/pages/*.md，不硬编码 about/friends
  const pageUrls = slugsIn(PAGES_DIR).map(
    (slug) => `${base}/pages/${encodeURIComponent(slug)}/`,
  );

  return [...new Set([...staticUrls, ...postUrls, ...pageUrls])];
}

async function submit(urlList: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY || "";
  if (!key) {
    console.error("⚠️  缺少 INDEXNOW_KEY，请先在 .env.local 配置");
    process.exit(1);
  }
  if (urlList.length === 0) {
    console.error("⚠️  没有可提交的 URL");
    process.exit(1);
  }

  const host = new URL(urlList[0]).hostname;
  const keyLocation = `https://${host}/indexnow-key-${key}.txt`;

  const body = {
    host,
    key,
    keyLocation,
    urlList,
  };

  const res = await withRetry(
    () =>
      fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      }),
    {
      attempts: 3,
      label: "IndexNow submit",
      // IndexNow 对 4xx 不重试（同一 key 重复提交会 422/429）
      isRetryable: (e) => {
        const status = (e as { status?: number } | null)?.status;
        if (typeof status !== "number") return true;
        return status === 429 || status >= 500;
      },
    },
  );

  if (res.ok || res.status === 202) {
    console.log(`✅ 提交成功：${urlList.length} 个 URL → ${host}`);
  } else {
    const text = await res.text().catch(() => "");
    console.error(`❌ 提交失败 HTTP ${res.status}: ${text}`);
    process.exit(1);
  }
}

async function main() {
  const urlList = buildUrlList();
  console.log(`🔗 本次提交 ${urlList.length} 个 URL`);
  await submit(urlList);
}

main();