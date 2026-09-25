#!/usr/bin/env tsx

import path from "node:path";
import { PageObjectResponse } from "@notionhq/client";
import { NotionDatabaseFetcher, NotionFetcherConfig } from "./notion-fetcher";
import { PostMetadata, SyncMode } from "./types";
import { parseSyncArgs } from "../lib/cli";
import {
  getTextProperty,
  getSelectProperty,
  getMultiSelectProperty,
  getDateProperty,
  getFilesProperty,
  loadEnv,
  requireProperty,
  sanitizeFileName,
} from "./utils";

function extractPostMeta(page: PageObjectResponse): PostMetadata {
  const properties = page.properties as Record<string, unknown>;
  // 属性缺失立刻抛错，而不是静默产出空 frontmatter
  const prop = (name: string) => requireProperty(properties, name, "post");
  return {
    page_id: page.id,
    title: getTextProperty(prop("title")),
    slug: sanitizeFileName(getTextProperty(prop("slug"))),
    category: getSelectProperty(prop("category")),
    tags: getMultiSelectProperty(prop("tags")),
    date: getDateProperty(prop("date")),
    summary: getTextProperty(prop("summary")),
    cover: getFilesProperty(prop("cover")),
    status: getSelectProperty(prop("status")),
    last_edited_time: page.last_edited_time,
    last_fetched_time: getDateProperty(prop("last_fetched_time")),
  };
}

/** 生成 YAML 安全字符串（双引号风格，兼容 JSON 转义）。 */
const yamlString = (value: string): string => JSON.stringify(value);

export function generateMDXContent(metadata: PostMetadata, content: string): string {
  const lines = [
    "---",
    `title: ${yamlString(metadata.title)}`,
    `slug: ${yamlString(metadata.slug)}`,
    `date: ${yamlString(metadata.date)}`,
    `category: ${yamlString(metadata.category)}`,
    `tags: [${metadata.tags.map((tag) => yamlString(tag)).join(", ")}]`,
    `summary: ${yamlString(metadata.summary)}`,
  ];
  if (metadata.cover) {
    lines.push(`cover: ${yamlString(metadata.cover)}`);
  }
  lines.push(
    `status: ${yamlString(metadata.status)}`,
    `page_id: ${yamlString(metadata.page_id)}`,
    `last_edited_time: ${yamlString(metadata.last_edited_time)}`,
    "---",
    "",
    content,
  );
  return lines.join("\n");
}

/**
 * 必须在 loadEnv() 之后调用。
 * 此前 config 在模块作用域构造，而 loadEnv() 只在 main() 里，
 * 之所以能跑纯粹靠 r2-uploader.ts 顶层副作用经 import 链传递加载了 dotenv——
 * 调整任一 import 顺序都会全线崩。
 */
function buildPostConfig(): NotionFetcherConfig<PostMetadata> {
  return {
    databaseId: process.env.NOTION_POSTS_DATABASE_ID || "",
    notionApiSecret: process.env.NOTION_API_SECRET || "",
    outputDir: path.join(process.cwd(), "content/posts"),
    label: "post",
    imagePrefix: "posts",
    lastFetchedTimeProperty: "last_fetched_time",
    buildFilter: (since?: Date) => ({
      and: [
        { property: "status", select: { equals: "Published" } },
        ...(since
          ? [
              {
                timestamp: "last_edited_time",
                last_edited_time: { on_or_after: since.toISOString() },
              },
            ]
          : []),
      ],
    }),
    buildSort: () => [{ property: "date", direction: "descending" }],
    extractMetadata: extractPostMeta,
    getFileKey: (e) => e.slug,
    getPageId: (e) => e.page_id,
    getConvertIdentifier: (e) => e.slug,
    getLastFetchedTime: (e) => e.last_fetched_time,
    getLastEditedTime: (e) => e.last_edited_time,
    generateContent: generateMDXContent,
    withLastFetchedTime: (e, t) => ({ ...e, last_fetched_time: t }),
  };
}

async function main() {
  loadEnv();

  const postConfig = buildPostConfig();
  if (!postConfig.databaseId || !postConfig.notionApiSecret) {
    throw new Error(
      "Missing required environment variables: NOTION_POSTS_DATABASE_ID, NOTION_API_SECRET",
    );
  }

  const args = parseSyncArgs();
  const syncMode: SyncMode = args.force ? "force" : args.fullSync ? "full-sync" : "incremental";

  const result = await new NotionDatabaseFetcher(postConfig, syncMode, {
    dryRun: args.dryRun,
  }).fetch();

  if (args.strict && result.errors > 0) {
    console.error(`❌ Strict mode: ${result.errors} error(s) occurred.`);
    process.exitCode = 1;
  }
  // 不使用 process.exit(0)：它会截断已缓冲的 stdout，并可能中断在途的
  // sharp / fetch 等异步任务。让 main 自然结束即可。
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});