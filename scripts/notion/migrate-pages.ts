#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import { markdownToBlocks } from "@tryfabric/martian";
import matter from "gray-matter";
import { loadEnv, resolveDataSourceId } from "./utils";

/**
 * 一次性迁移脚本：把 content/pages/ 下的存量 md 导入 Notion Pages 库。
 * - iframe：约页（about.md）直接导入
 * - friends：从 src/data/friends.ts 读取好友列表生成 markdown，导入 friends 页
 * 幂等：按 slug 跳过已存在（--force 强制更新）
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

async function slugExists(notion: Client, databaseId: string, slug: string): Promise<boolean> {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: "slug", rich_text: { equals: slug } },
    page_size: 1,
  });
  return res.results.length > 0;
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

  const blocks = markdownToBlocks(entry.content) as unknown as import("@notionhq/client").BlockObjectRequest[];
  const chunkSize = 100;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    await notion.blocks.children.append({ block_id: page.id, children: chunk });
    console.log(`  ⏳ Appended blocks ${i + 1}-${Math.min(i + chunkSize, blocks.length)}/${blocks.length}`);
    await new Promise((r) => setTimeout(r, 300));
  }
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
      const exists = await slugExists(notion, databaseId, entry.slug);
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