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

// 从 src/data/friends.ts 读取好友数据（简单解析 export const FRIENDS = [...]）
function parseFriends(): Array<{ name: string; url: string; description?: string; avatar?: string }> {
  const file = path.join(process.cwd(), "src", "data", "friends.ts");
  const raw = fs.readFileSync(file, "utf-8");
  const friends = [];
  const re = /\{\s*name:\s*"([^"]*)",\s*url:\s*"([^"]*)",\s*description:\s*"([^"]*)",\s*avatar:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    friends.push({ name: m[1], url: m[2], description: m[3], avatar: m[4] });
  }
  return friends;
}

function buildFriendsMarkdown(): string {
  const friends = parseFriends();
  const lines = [
    "# 友链",
    "",
    "收录的每一位好友，都值得去逛逛。",
    "",
    "## 好友列表",
    "",
  ];
  for (const f of friends) {
    lines.push(`- [${f.name}](${f.url})${f.description ? ` — ${f.description}` : ""}`);
  }
  lines.push(
    "",
    "---",
    "",
    "## 申请友链",
    "",
    "欢迎交换友链，请提供**站点名称** + **链接** + **一句简介** + **头像 URL (可选)**，我会尽快审核并收录。",
    "",
  );
  return lines.join("\n");
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

  const entries: Array<{ slug: string; title: string; description: string; content: string; comments: boolean }> = [];

  // about.md
  const aboutFile = path.join(PAGES_DIR, "about.md");
  if (fs.existsSync(aboutFile)) {
    const raw = fs.readFileSync(aboutFile, "utf-8");
    const { data, content } = matter(raw);
    entries.push({
      slug: "about",
      title: String(data.title || "关于"),
      description: String(data.description || ""),
      content: content.trim(),
      comments: false,
    });
  }

  // friends
  entries.push({
    slug: "friends",
    title: "友链",
    description: "值得一去的好友与工具站点。",
    content: buildFriendsMarkdown(),
    comments: false,
  });

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