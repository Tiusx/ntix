import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import type { FetchResult } from "./types";

/** 从 Next.js 约定的 .env.local / .env 中加载环境变量（幂等）。 */
export function loadEnv(): void {
  dotenv.config({ path: [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")] });
}

/**
 * 从 database_id 解析关联的第一个 data_source_id（新版 Notion SDK 要求）。
 * databases.create 返回的 data_sources[0].id 即为该库关联的 data source。
 */
export async function resolveDataSourceId(
  notion: Client,
  databaseId: string,
): Promise<string> {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = (db as Record<string, unknown>)?.data_sources as
    | Array<{ id: string; name: string }>
    | undefined;
  if (ds?.[0]?.id) return ds[0].id;
  throw new Error(`Database ${databaseId} has no associated data source`);
}

// ─── Notion property helpers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTextProperty = (prop: any): string => {
  if (!prop) return "";
  if (prop.type === "title") return prop.title.map((t: any) => t.plain_text).join("");
  if (prop.type === "rich_text") return prop.rich_text.map((t: any) => t.plain_text).join("");
  return "";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSelectProperty = (prop: any): string => prop?.select?.name || "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMultiSelectProperty = (prop: any): string[] =>
  prop?.multi_select?.map((item: any) => item.name) || [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDateProperty = (prop: any): string => prop?.date?.start || "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getFilesProperty = (prop: any): string => {
  const files = prop?.files;
  if (!Array.isArray(files) || files.length === 0) return "";
  const first = files[0];
  if (first.type === "file") return first.file.url;
  if (first.type === "external") return first.external.url;
  return "";
};

// ─── File system helpers ──────────────────────────────────────────────────────

export function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

/** 文件名安全化：去掉非法字符，避免生成无法落盘的 slug 文件。 */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || "untitled";
}

/**
 * 清理目录中不在 published 集合内的 .md 文件。
 * 保留 _placeholder.md（ntix 用它保证 webpack 动态 import 上下文在空目录时可用）。
 */
export function cleanupOrphanedFiles(
  dir: string,
  publishedIds: Set<string>,
  result: FetchResult,
): void {
  try {
    const files = fs.readdirSync(dir);
    let checked = 0;
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      if (file.startsWith("_")) continue;
      checked++;
      const id = file.replace(/\.md$/, "");
      if (!publishedIds.has(id)) {
        try {
          fs.unlinkSync(path.join(dir, file));
          result.deleted++;
          console.log(`🗑️ Deleted orphaned file: ${file}`);
        } catch (err) {
          result.errors++;
          console.error(`❌ Failed to delete orphaned file ${file}:`, err);
        }
      }
    }
    console.log(`🧹 Orphan cleanup checked ${checked} files in ${dir}`);
  } catch (err) {
    result.errors++;
    console.error("❌ Failed during orphaned files cleanup:", err);
  }
}