#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
  path: [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")],
});

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const DEFAULT_SITE_URL = "https://tius.cn";

const STATIC_PATHS = [
  "",
  "/pages/about/",
  "/archive/",
  "/blog/",
  "/categories/",
  "/columns/",
  "/friends/",
  "/memos/",
  "/tags/",
];

function buildUrlList(): string[] {
  const base = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

  const staticUrls = STATIC_PATHS.map((p) => `${base}${p}`);

  const postUrls = fs.existsSync(POSTS_DIR)
    ? fs
        .readdirSync(POSTS_DIR)
        .filter((file) => file.endsWith(".md") && file.startsWith("_") === false)
        .map((file) => file.replace(/\.md$/, ""))
        .map((slug) => `${base}/posts/${encodeURIComponent(slug)}/`)
    : [];

  const unique = [...staticUrls, ...postUrls];
  return [...new Set(unique)];
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

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

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