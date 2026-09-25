import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client";
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
//
// 这些 getter 曾用 `any`，导致 Notion 属性一改名就静默返回 ""，
// 生成的 frontmatter 全空却没有任何报错。这里改为收窄到具体类型，
// 并提供 requireProperty 在属性缺失时快速失败。

/** Notion page property 的宽松视图：只声明本模块实际读取的字段。 */
interface PropertyValue {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  date?: { start?: string | null } | null;
  checkbox?: boolean;
  files?: Array<{
    type?: string;
    name?: string;
    file?: { url?: string };
    external?: { url?: string };
  }>;
}

type Properties = Record<string, unknown>;

/**
 * 取出指定属性；不存在则抛错。
 *
 * 之前所有 getter 都是 `prop?.x ?? ""`，属性被改名 / 删除时全部静默降级为空值，
 * 表现为「同步成功但 frontmatter 全空」，极难排查。这里让缺失立刻可见。
 */
export function requireProperty(
  properties: Properties,
  name: string,
  context: string,
): PropertyValue {
  const prop = properties[name];
  if (prop === undefined || prop === null) {
    throw new Error(
      `Notion ${context} is missing the "${name}" property. ` +
        `Available: ${Object.keys(properties).join(", ") || "(none)"}`,
    );
  }
  return prop as PropertyValue;
}

const joinPlainText = (items?: Array<{ plain_text?: string }>): string =>
  (items ?? []).map((t) => t.plain_text ?? "").join("");

export const getTextProperty = (prop: PropertyValue | undefined): string => {
  if (!prop) return "";
  if (prop.type === "title") return joinPlainText(prop.title);
  if (prop.type === "rich_text") return joinPlainText(prop.rich_text);
  return "";
};

export const getSelectProperty = (prop: PropertyValue | undefined): string =>
  prop?.select?.name ?? "";

export const getMultiSelectProperty = (prop: PropertyValue | undefined): string[] =>
  (prop?.multi_select ?? []).map((item) => item.name ?? "").filter(Boolean);

export const getDateProperty = (prop: PropertyValue | undefined): string =>
  prop?.date?.start ?? "";

export const getCheckboxProperty = (prop: PropertyValue | undefined): boolean =>
  Boolean(prop?.checkbox);

export const getFilesProperty = (prop: PropertyValue | undefined): string => {
  const files = prop?.files;
  if (!Array.isArray(files) || files.length === 0) return "";
  const first = files[0];
  if (first.type === "file") return first.file?.url ?? "";
  if (first.type === "external") return first.external?.url ?? "";
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

/** 列出目录下所有可管理的 markdown slug（跳过 _ 前缀的构建占位文件）。 */
export function listManagedSlugs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/, ""));
}

/**
 * 判断 Notion 数据库中是否已存在指定 slug。
 * 迁移脚本按 slug 幂等，两个迁移脚本共用此实现。
 */
export async function slugExistsInNotion(
  notion: Client,
  databaseId: string,
  slug: string,
): Promise<boolean> {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: "slug", rich_text: { equals: slug } },
    page_size: 1,
  });
  return res.results.length > 0;
}

/** Notion blocks 分块追加：单次 API 上限 100 blocks。 */
export async function appendBlocksInChunks(
  notion: Client,
  blockId: string,
  blocks: BlockObjectRequest[],
  options: { chunkSize?: number; delayMs?: number } = {},
): Promise<void> {
  const { chunkSize = 100, delayMs = 300 } = options;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    await notion.blocks.children.append({ block_id: blockId, children: chunk });
    if (i + chunkSize < blocks.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export interface CleanupOptions {
  /** 只打印待删清单，不落盘 */
  dryRun?: boolean;
  /** 跳过比例阈值检查（人工确认后使用） */
  force?: boolean;
  /** 待删比例超过此值即中止，默认 0.5 */
  maxDeleteRatio?: number;
}

const DEFAULT_MAX_DELETE_RATIO = 0.5;

/** 列出一行以内可读的清单，超出则截断。 */
function preview(names: string[], limit = 10): string {
  const shown = names.slice(0, limit).join(", ");
  return names.length > limit ? `${shown} …（共 ${names.length} 个）` : shown;
}

/**
 * 清理目录中不在 published 集合内的 .md 文件。
 * 保留 _placeholder.md（ntix 用它保证 webpack 动态 import 上下文在空目录时可用）。
 *
 * 安全护栏：publishedIds 为空、或待删比例异常时直接抛错中止，绝不删除。
 * Notion 查询一旦因配置错误 / 权限变更返回空结果，publishedIds 即为空，
 * 此时若无护栏会清空整个 content 目录。
 */
export function cleanupOrphanedFiles(
  dir: string,
  publishedIds: Set<string>,
  result: FetchResult,
  options: CleanupOptions = {},
): void {
  const { dryRun = false, force = false, maxDeleteRatio = DEFAULT_MAX_DELETE_RATIO } = options;

  // 护栏 1：published 为空一定是查询出了问题，不是「内容都下架了」
  if (publishedIds.size === 0) {
    throw new Error(
      `Refusing to clean ${dir}: Notion returned 0 published entries. ` +
        `This usually means a wrong database id, a renamed "status" select option, ` +
        `or lost API access — not that all content was removed. ` +
        `Re-check the Notion config, then re-run with --force if the wipe is intended.`,
    );
  }

  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    result.errors++;
    console.error("❌ Failed during orphaned files cleanup:", err);
    return;
  }

  const managed = files.filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const orphans = managed.filter((f) => !publishedIds.has(f.replace(/\.md$/, "")));

  if (orphans.length === 0) {
    console.log(`🧹 Orphan cleanup: ${managed.length} files, nothing to remove (${dir})`);
    return;
  }

  // 护栏 2：待删比例过高通常是查询结果不完整
  const ratio = orphans.length / managed.length;
  if (ratio > maxDeleteRatio && !force) {
    throw new Error(
      `Refusing to delete ${orphans.length}/${managed.length} files (${Math.round(ratio * 100)}%) ` +
        `in ${dir} — above the ${Math.round(maxDeleteRatio * 100)}% safety threshold. ` +
        `Orphans: ${preview(orphans)}. ` +
        `Re-run with --force to delete them anyway.`,
    );
  }

  console.log(
    `🧹 Orphan cleanup: ${orphans.length}/${managed.length} files are no longer published in ${dir}`,
  );

  if (dryRun) {
    console.log(`   [dry-run] would delete: ${preview(orphans)}`);
    return;
  }

  for (const file of orphans) {
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
