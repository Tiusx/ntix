#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { Client, type BlockObjectRequest } from "@notionhq/client";
import { markdownToBlocks } from "@tryfabric/martian";
import matter from "gray-matter";
import {
  appendBlocksInChunks,
  loadEnv,
  slugExistsInNotion,
} from "./utils";

/**
 * 一次性迁移脚本：把 content/pages/ 下的全部存量 md 导入 Notion Pages 库。
 * 幂等：按 slug 跳过已存在（Notion page 属性无法直接覆盖，需先在 Notion 中删除该行）
 */

const PAGES_DIR = path.join(process.cwd(), "content", "pages");

/**
 * 读取 content/pages/ 下的全部 Markdown 作为迁移源。
 * 友链等内容早已收口为 friends.md（由 Notion 自身管理），
 * 因此不再从任何 TypeScript 源文件里正则刮取。
 */
function collectLocalPages(): Array<{
  slug: string;
  title: string;
  description: string;
  content: string;
  comments: boolean;
}> {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const entries: Array<{
    slug: string;
    title: string;
    description: string;
    content: string;
    comments: boolean;
  }> = [];

  for (const file of fs.readdirSync(PAGES_DIR).sort()) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const { data, content } = matter(fs.readFileSync(path.join(PAGES_DIR, file), "utf-8"));
    const slug = String(data.slug || file.replace(/\.md$/, ""));
    entries.push({
      slug,
      title: String(data.title || slug),
      description: String(data.description || ""),
      content: content.trim(),
      comments: data.comment === true || data.comment === "true",
    });
  }
  return entries;
}

async function createPage(
  notion: Client,
  databaseId: string,
  entry: { slug: string; title: string; description: string; content: string; comments: boolean },
): Promise<void> {
  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      title: { title: [{ type: "text", text: { content: entry.title } }] },
      slug: { rich_text: [{ type: "text", text: { content: entry.slug } }] },
      description: { rich_text: [{ type: "text", text: { content: entry.description } }] },
      status: { select: { name: "Published" } },
      enable_comments: { checkbox: entry.comments },
    },
  });

  const blocks = markdownToBlocks(entry.content) as unknown as BlockObjectRequest[];
  await appendBlocksInChunks(notion, page.id, blocks);
  console.log(`✅ Created page: ${entry.title} (${entry.slug})`);
}

async function main() {
  loadEnv();

  const apiKey = process.env.NOTION_API_SECRET;
  const databaseId = process.env.NOTION_PAGES_DATABASE_ID;
  if (!apiKey || !databaseId) {
    throw new Error("Missing NOTION_API_SECRET / NOTION_PAGES_DATABASE_ID");
  }
  const notion = new Client({ auth: apiKey });

  const force = process.argv.includes("--force");

  const entries = collectLocalPages();
  if (entries.length === 0) {
    console.log(`⚠️  No .md files found in ${PAGES_DIR} — nothing to import.`);
    return;
  }
  console.log(`📚 Found ${entries.length} local page(s) to import`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const exists = await slugExistsInNotion(notion, databaseId, entry.slug);
      if (exists && !force) {
        skipped++;
        console.log(`⏭️  Skipped existing: ${entry.slug}（--force 强制更新）`);
        continue;
      }
      if (exists && force) {
        console.warn(`⚠️  ${entry.slug} 已存在；请先在 Notion 中删除该行再重跑。`);
        skipped++;
        continue;
      }
      await createPage(notion, databaseId, entry);
      created++;
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      failed++;
      console.error(`❌ Failed to import ${entry.slug}:`, err);
    }
  }

  console.log(`🎉 Import done: created=${created}, skipped=${skipped}, failed=${failed}`);
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});