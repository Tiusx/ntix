#!/usr/bin/env tsx

import path from "node:path";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionDatabaseFetcher, NotionFetcherConfig } from "./notion-fetcher";
import { PostMetadata, SyncMode } from "./types";
import {
  getTextProperty,
  getSelectProperty,
  getMultiSelectProperty,
  getDateProperty,
  getFilesProperty,
  loadEnv,
  sanitizeFileName,
} from "./utils";

function extractPostMeta(page: PageObjectResponse): PostMetadata {
  const properties = page.properties;
  return {
    page_id: page.id,
    title: getTextProperty(properties.title),
    slug: sanitizeFileName(getTextProperty(properties.slug)),
    category: getSelectProperty(properties.category),
    tags: getMultiSelectProperty(properties.tags),
    date: getDateProperty(properties.date),
    summary: getTextProperty(properties.summary),
    cover: getFilesProperty(properties.cover),
    status: getSelectProperty(properties.status),
    last_edited_time: page.last_edited_time,
    last_fetched_time: getDateProperty(properties.last_fetched_time),
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

const postConfig: NotionFetcherConfig<PostMetadata> = {
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

async function main() {
  loadEnv();

  if (!postConfig.databaseId || !postConfig.notionApiSecret) {
    throw new Error(
      "Missing required environment variables: NOTION_POSTS_DATABASE_ID, NOTION_API_SECRET",
    );
  }

  const syncMode: SyncMode = process.argv.includes("--force")
    ? "force"
    : process.argv.includes("--full-sync")
      ? "full-sync"
      : "incremental";

  const result = await new NotionDatabaseFetcher(postConfig, syncMode).fetch();

  if (process.argv.includes("--strict") && result.errors > 0) {
    console.error(`❌ Strict mode: ${result.errors} error(s) occurred.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});