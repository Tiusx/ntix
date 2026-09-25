#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import { markdownToBlocks } from "@tryfabric/martian";
import matter from "gray-matter";
import { loadEnv, resolveDataSourceId, sanitizeFileName } from "./utils";
import { CATEGORY_META_KEYS } from "../../src/lib/posts";

/**
 * 一次性迁移脚本：
 * 1. 若 NOTION_POSTS_DATABASE_ID 未设置，自动创建 Notion database
 * 2. 读取 content/posts/ 下的存量 Markdown，导入为 Notion database 中的 page
 * 3. 按 slug 幂等：已存在则跳过（--force 强制更新）
 */

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const STATUS_OPTIONS = ["Published", "Draft"];
/** 分类白名单与站点侧注册表保持单一来源，避免两处漂移。 */
const CATEGORY_OPTIONS = CATEGORY_META_KEYS;

interface LocalPost {
  file: string;
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  status: string;
  content: string;
}

function parseLocalPosts(): LocalPost[] {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const posts: LocalPost[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    if (!data.title || !data.date) {
      console.warn(`⚠️ Skipping ${file}: missing title/date`);
      continue;
    }
    posts.push({
      file,
      title: String(data.title),
      slug: sanitizeFileName(String(data.slug || file.replace(/\.md$/, ""))),
      date: String(data.date).slice(0, 10),
      category: String(data.category || "其他"),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      summary: String(data.summary || ""),
      status: String(data.status || "Published"),
      content,
    });
  }

  return posts;
}

async function ensureDatabase(notion: Client): Promise<string> {
  const existing = process.env.NOTION_POSTS_DATABASE_ID;
  if (existing) {
    console.log(`📚 Using existing database: ${existing}`);
    return existing;
  }

  const parentPageId = process.env.NOTION_PAGE_ID;
  if (!parentPageId) {
    throw new Error("No NOTION_POSTS_DATABASE_ID and no NOTION_PAGE_ID to create database under.");
  }

  console.log(`🛠️  Creating Notion database under page ${parentPageId}...`);
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "博客文章" } }],
    initial_data_source: {
      properties: {
        title: { title: {} },
        slug: { rich_text: {} },
        date: { date: {} },
        category: {
          select: { options: CATEGORY_OPTIONS.map((name) => ({ name, color: "default" })) },
        },
        tags: { multi_select: { options: [] } },
        summary: { rich_text: {} },
        status: {
          select: { options: STATUS_OPTIONS.map((name) => ({ name, color: "default" })) },
        },
        cover: { files: {} },
        last_fetched_time: { date: {} },
      },
    },
  });
  const id = db.id;
  console.log(`✅ Created database: ${id}`);
  return id;
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

async function createPostPage(
  notion: Client,
  databaseId: string,
  post: LocalPost,
): Promise<void> {
  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      title: { title: [{ type: "text", text: { content: post.title } }] },
      slug: { rich_text: [{ type: "text", text: { content: post.slug } }] },
      date: { date: { start: post.date } },
      category: { select: { name: post.category } },
      tags: { multi_select: post.tags.map((name) => ({ name })) },
      summary: { rich_text: [{ type: "text", text: { content: post.summary } }] },
      status: { select: { name: post.status } },
    },
  });

  // 正文 Markdown → Notion blocks，分块写入（API 单次上限 100 blocks）
  const blocks = markdownToBlocks(post.content) as unknown as import("@notionhq/client").BlockObjectRequest[];
  const chunkSize = 100;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    await notion.blocks.children.append({ block_id: page.id, children: chunk });
    console.log(`  ⏳ Appended blocks ${i + 1}-${Math.min(i + chunkSize, blocks.length)}/${blocks.length}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`✅ Created page: ${post.title} (${post.slug})`);
}

async function main() {
  loadEnv();

  const notionApiSecret = process.env.NOTION_API_SECRET;
  if (!notionApiSecret) {
    throw new Error("Missing NOTION_API_SECRET");
  }

  const notion = new Client({ auth: notionApiSecret });
  const databaseId = await ensureDatabase(notion);

  const posts = parseLocalPosts();
  console.log(`📖 Found ${posts.length} local posts to import`);

  const force = process.argv.includes("--force");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const exists = await slugExists(notion, databaseId, post.slug);
      if (exists) {
        // Notion page 属性无法直接覆盖，需先在 Notion 中删除该行再重跑
        console.warn(`⚠️  ${post.slug} 已存在，跳过。如需覆盖请先在 Notion 中删除该行再重跑。`);
        skipped++;
        continue;
      }
      await createPostPage(notion, databaseId, post);
      created++;
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      failed++;
      console.error(`❌ Failed to import ${post.slug}:`, err);
    }
  }

  console.log(`🎉 Import done: created=${created}, skipped=${skipped}, failed=${failed}`);
  console.log(`\n💾 Save this to .env.local and GitHub secrets:`);
  console.log(`NOTION_POSTS_DATABASE_ID=${databaseId}`);
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});