#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { SearchEntry } from "../src/lib/search-index";
import { listManagedSlugs } from "./notion/utils";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const OUT_DIR = path.join(process.cwd(), "public");
const OUT_FILE = path.join(OUT_DIR, "search-index.json");

/**
 * 把 Markdown 压成纯文本，供索引与片段展示使用。
 * 额外剥离 HTML 标签与实体——Notion 转换结果里常混入 <img>、&amp; 等，
 * 直接进索引会污染搜索结果与高亮。
 */
export function stripMarkdown(markdown: string): string {
  return (
    markdown
      // 代码块与行内代码
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      // 图片整条丢弃，链接保留锚文本
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // 标题 / 列表 / 引用 / 分隔线
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/^\s*([-*_])\1{2,}\s*$/gm, " ")
      .replace(/^>\s?/gm, "")
      // 强调
      .replace(/\*\*([^*]*)\*\*/g, "$1")
      .replace(/\*([^*]*)\*/g, "$1")
      .replace(/~~([^~]*)~~/g, "$1")
      // HTML 标签与常见实体
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      // 折叠空白
      .replace(/\s+/g, " ")
      .trim()
  );
}

function buildEntries(): SearchEntry[] {
  return listManagedSlugs(POSTS_DIR)
    .map((slug) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.md`), "utf-8");
      const { data, content } = matter(raw);
      const meta = data as Record<string, unknown>;
      return {
        slug: typeof meta.slug === "string" && meta.slug ? meta.slug : slug,
        title: typeof meta.title === "string" ? meta.title : "",
        date: typeof meta.date === "string" ? meta.date : "",
        category: typeof meta.category === "string" ? meta.category : "",
        tags: Array.isArray(meta.tags)
          ? meta.tags.filter((t): t is string => typeof t === "string")
          : [],
        summary: typeof meta.summary === "string" ? meta.summary : "",
        content: stripMarkdown(content),
      };
    })
    .filter((entry) => entry.title && entry.content)
    .sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`posts dir not found: ${POSTS_DIR}`);
    process.exit(1);
  }

  const entries = buildEntries();

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(entries), "utf-8");
  const bytes = fs.statSync(OUT_FILE).size;
  console.log(
    `🔍 生成搜索索引：${entries.length} 篇文章 → public/search-index.json (${(bytes / 1024).toFixed(1)} KB)`,
  );
}

main();
