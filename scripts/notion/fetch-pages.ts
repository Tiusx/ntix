#!/usr/bin/env tsx

import path from "node:path";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionDatabaseFetcher, NotionFetcherConfig } from "./notion-fetcher";
import { SyncMode } from "./types";
import { parseSyncArgs } from "../lib/cli";
import {
  getTextProperty,
  getSelectProperty,
  getCheckboxProperty,
  getDateProperty,
  loadEnv,
  sanitizeFileName,
} from "./utils";

export interface PageMetadata {
  page_id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  enable_comments: boolean;
  last_edited_time: string;
  last_fetched_time: string | null;
}

/** 与顶级/保留路由冲突的 slug，避免被 [slug] 遮蔽或构建异常 */

function extractPageMeta(page: PageObjectResponse): PageMetadata {
  const properties = page.properties;
  const slug = sanitizeFileName(getTextProperty(properties.slug));
  return {
    page_id: page.id,
    title: getTextProperty(properties.title),
    slug,
    description: getTextProperty(properties.description),
    status: getSelectProperty(properties.status),
    enable_comments: getCheckboxProperty(properties.enable_comments),
    last_edited_time: page.last_edited_time,
    last_fetched_time: getDateProperty(properties.last_fetched_time),
  };
}

const yamlString = (value: string): string => JSON.stringify(value);

export function generatePageContent(metadata: PageMetadata, content: string): string {
  const lines = [
    "---",
    `title: ${yamlString(metadata.title)}`,
    `slug: ${yamlString(metadata.slug)}`,
    `description: ${yamlString(metadata.description)}`,
    `status: ${yamlString(metadata.status)}`,
    `comment: ${metadata.enable_comments ? "true" : "false"}`,
    `page_id: ${yamlString(metadata.page_id)}`,
    `last_edited_time: ${yamlString(metadata.last_edited_time)}`,
    "---",
    "",
    content,
  ];
  return lines.join("\n");
}

const pageConfig: NotionFetcherConfig<PageMetadata> = {
  databaseId: process.env.NOTION_PAGES_DATABASE_ID || "",
  notionApiSecret: process.env.NOTION_API_SECRET || "",
  outputDir: path.join(process.cwd(), "content/pages"),
  label: "page",
  imagePrefix: "pages",
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
  buildSort: () => [{ property: "title", direction: "ascending" }],
  extractMetadata: extractPageMeta,
  getFileKey: (e) => e.slug,
  getPageId: (e) => e.page_id,
  getConvertIdentifier: (e) => e.slug,
  getLastFetchedTime: (e) => e.last_fetched_time,
  getLastEditedTime: (e) => e.last_edited_time,
  generateContent: generatePageContent,
  withLastFetchedTime: (e, t) => ({ ...e, last_fetched_time: t }),
};

async function main() {
  loadEnv();

  if (!pageConfig.databaseId || !pageConfig.notionApiSecret) {
    throw new Error(
      "Missing required environment variables: NOTION_PAGES_DATABASE_ID, NOTION_API_SECRET",
    );
  }

  const args = parseSyncArgs();
  const syncMode: SyncMode = args.force ? "force" : args.fullSync ? "full-sync" : "incremental";

  const result = await new NotionDatabaseFetcher(pageConfig, syncMode, {
    dryRun: args.dryRun,
  }).fetch();

  if (args.strict && result.errors > 0) {
    console.error(`❌ Strict mode: ${result.errors} error(s) occurred.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});