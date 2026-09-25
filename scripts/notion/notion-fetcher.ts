import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMDXConverter } from "./notion-to-md";
import { FetchResult, FetchState, FetchStateEntry, SyncMode } from "./types";
import { ensureDirectory, cleanupOrphanedFiles, resolveDataSourceId } from "./utils";
import { withRetry } from "../lib/retry";

export interface NotionFetcherConfig<T> {
  databaseId: string;
  notionApiSecret: string;
  outputDir: string;
  /** Notion 中记录本次抓取时间的属性名 */
  lastFetchedTimeProperty: string;
  /** 日志标签，如 "post" */
  label: string;
  /** 图片 key 中的库标识前缀，如 "posts" */
  imagePrefix: string;

  buildFilter(since?: Date): object;
  buildSort(): object[];

  extractMetadata(page: PageObjectResponse): T;
  /** 本地文件名（不含 .md），如 slug 或 page_id */
  getFileKey(entry: T): string;
  getPageId(entry: T): string;
  /** 传给 convertToMDX 的标识符 */
  getConvertIdentifier(entry: T): string;
  getLastFetchedTime(entry: T): string | null;
  getLastEditedTime(entry: T): string;
  generateContent(entry: T, content: string): string;
  withLastFetchedTime(entry: T, time: string): T;
  beforeGenerateContent?: (entry: T) => Promise<T>;
}

const STATE_FILE = path.join(process.cwd(), ".fetch-state.json");

export interface FetcherOptions {
  /** 只打印将要发生的变更，不落盘（不写 content，也不推进 .fetch-state.json） */
  dryRun?: boolean;
}

export class NotionDatabaseFetcher<T> {
  private notion: Client;
  private converter: NotionToMDXConverter;
  private dryRun: boolean;

  constructor(
    private config: NotionFetcherConfig<T>,
    private syncMode: SyncMode,
    options: FetcherOptions = {},
  ) {
    this.notion = new Client({ auth: config.notionApiSecret });
    this.converter = new NotionToMDXConverter(config.notionApiSecret, config.imagePrefix, {
      dryRun: options.dryRun ?? false,
    });
    this.dryRun = options.dryRun ?? false;
  }

  async fetch(): Promise<FetchResult> {
    let effectiveSyncMode = this.syncMode;
    let since: Date | undefined;

    const existingState = this.readState();

    if (this.syncMode === "incremental") {
      if (!existingState?.lastSuccessfulRun) {
        console.log(
          `⚠️  No previous run state for "${this.config.label}", falling back to full-sync`,
        );
        effectiveSyncMode = "full-sync";
      } else {
        since = new Date(existingState.lastSuccessfulRun);
      }
    }

    if (this.dryRun) {
      console.log(`🔍 DRY RUN — no files will be written and no state will be saved.`);
    }

    console.log(
      `🚀 Starting to fetch ${this.config.label} [${effectiveSyncMode}]${since ? ` since ${since.toISOString()}` : ""}...`,
    );

    const result: FetchResult = { updated: 0, skipped: 0, errors: 0, deleted: 0 };
    const shouldCleanOrphans = effectiveSyncMode !== "incremental";

    ensureDirectory(this.config.outputDir);

    const allEntries = await this.queryAllEntries(since);
    console.log(`📚 Found ${allEntries.length} published ${this.config.label} entries`);

    const publishedIds = new Set(allEntries.map((e) => this.config.getFileKey(e)).filter(Boolean));
    const toUpdate = this.filterToUpdate(allEntries, effectiveSyncMode);
    console.log(`🔄 ${this.config.label} entries to update: ${toUpdate.length}`);

    if (toUpdate.length === 0 && effectiveSyncMode !== "force") {
      if (shouldCleanOrphans) {
        // 走到这里 effectiveSyncMode 只可能是 "full-sync"（incremental 不清理，
        // force 已被上面的条件短路），因此比例阈值始终生效，不可绕过。
        cleanupOrphanedFiles(this.config.outputDir, publishedIds, result, {
          dryRun: this.dryRun,
        });
      }
      console.log(`✅ All ${this.config.label} entries are up to date!`);
      this.persistState(result, effectiveSyncMode);
      return result;
    }

    for (const entry of toUpdate) {
      const label = this.config.getFileKey(entry) || this.config.getPageId(entry);
      try {
        await this.processEntry(entry);
        result.updated++;
        console.log(`✅ Updated ${this.config.label}: ${label}`);
      } catch (error) {
        result.errors++;
        console.error(`❌ Failed to update ${this.config.label} ${label}:`, error);
      }
    }

    if (shouldCleanOrphans) {
      cleanupOrphanedFiles(this.config.outputDir, publishedIds, result, {
        dryRun: this.dryRun,
        force: effectiveSyncMode === "force",
      });
    }

    console.log(
      `🎉 Done fetching ${this.config.label}! Updated: ${result.updated}, Deleted: ${result.deleted}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
    );

    this.persistState(result, effectiveSyncMode);

    return result;
  }

  /**
   * 推进 .fetch-state.json 的水位。
   * - dry-run 永不写状态
   * - 有 errors 时不推进：水位前移会让失败条目被永久跳过
   * - 零变更的成功运行也要推进：否则 since 永久停滞，增量查询成本单调增长
   */
  private persistState(result: FetchResult, mode: SyncMode): void {
    if (this.dryRun) {
      console.log(`🔍 DRY RUN — skipping state write for "${this.config.label}"`);
      return;
    }
    if (result.errors > 0) {
      console.warn(
        `⚠️  Not advancing sync watermark for "${this.config.label}": ${result.errors} error(s). ` +
          `Failed entries stay eligible for the next run.`,
      );
      return;
    }
    this.writeState(mode);
  }

  private readState(): FetchStateEntry | null {
    if (!fs.existsSync(STATE_FILE)) return null;
    try {
      const state: FetchState = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      return state[this.config.label] || null;
    } catch {
      return null;
    }
  }

  private writeState(mode: SyncMode): void {
    let state: FetchState = {};
    if (fs.existsSync(STATE_FILE)) {
      try {
        state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      } catch {
        state = {};
      }
    }
    const now = new Date().toISOString();
    const existing = state[this.config.label] || { lastSuccessfulRun: "", lastFullSync: "" };
    state[this.config.label] = {
      lastSuccessfulRun: now,
      lastFullSync: mode === "full-sync" || mode === "force" ? now : existing.lastFullSync,
    };
    // 原子写：先写临时文件再 rename，避免崩溃留下半截 JSON
    const tmp = `${STATE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmp, STATE_FILE);
    console.log(`💾 State saved for "${this.config.label}" [${mode}]`);
  }

  private async queryAllEntries(since?: Date): Promise<T[]> {
    const entries: T[] = [];
    let startCursor: string | undefined;

    const dataSourceId = await withRetry(
      () => resolveDataSourceId(this.notion, this.config.databaseId),
      { label: `resolve data source for "${this.config.label}"` },
    );

    do {
      const response = await withRetry(
        () =>
          this.notion.dataSources.query({
            data_source_id: dataSourceId,
            filter: this.config.buildFilter(since) as never,
            sorts: this.config.buildSort() as never,
            start_cursor: startCursor,
          }),
        { label: `query ${this.config.label} entries` },
      );

      const pageEntries = response.results
        .filter((page) => page.object === "page")
        .map((page) => this.config.extractMetadata(page as PageObjectResponse));
      entries.push(...pageEntries);
      startCursor = response.next_cursor || undefined;
    } while (startCursor);

    return entries;
  }

  private filterToUpdate(entries: T[], effectiveSyncMode: SyncMode): T[] {
    if (effectiveSyncMode === "force") {
      console.log(`🔥 Force mode enabled - will update ALL ${this.config.label} entries`);
      return entries;
    }

    return entries.filter((entry) => {
      const filePath = path.join(this.config.outputDir, `${this.config.getFileKey(entry)}.md`);

      if (!fs.existsSync(filePath)) {
        console.log(`📥 New ${this.config.label}: ${this.config.getFileKey(entry)}`);
        return true;
      }

      const lastFetchedTime = this.config.getLastFetchedTime(entry);
      if (!lastFetchedTime) {
        console.log(`🔄 First time fetch: ${this.config.getFileKey(entry)}`);
        return true;
      }

      const needsUpdate =
        new Date(this.config.getLastEditedTime(entry)) > new Date(lastFetchedTime);
      if (needsUpdate) {
        console.log(`🔄 Updated since last fetch: ${this.config.getFileKey(entry)}`);
      }
      return needsUpdate;
    });
  }

  private async processEntry(entry: T): Promise<void> {
    const identifier = this.config.getConvertIdentifier(entry);
    const pageId = this.config.getPageId(entry);

    // 处理 page property 中 files 类型的图片，上传到 R2 并更新 Notion
    const rawPage = (await this.notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
    const updatedPage = await this.converter.getImageProcessor().processPageFileProperties(rawPage);
    const updatedEntry = this.config.extractMetadata(updatedPage);

    const { content, imageStats } = await this.converter.convertToMDX(pageId, identifier);

    if (imageStats && imageStats.total > 0) {
      console.log(
        `📊 Images for ${identifier}: total=${imageStats.total}, processed=${imageStats.processed}, skipped=${imageStats.skipped}, errors=${imageStats.errors}`,
      );
    }

    let finalEntry = this.config.withLastFetchedTime(updatedEntry, new Date().toISOString());
    if (this.config.beforeGenerateContent) {
      finalEntry = await this.config.beforeGenerateContent(finalEntry);
    }
    const mdContent = this.config.generateContent(finalEntry, content);
    const filePath = path.join(this.config.outputDir, `${this.config.getFileKey(entry)}.md`);

    if (this.dryRun) {
      console.log(`🔍 DRY RUN — would write ${path.relative(process.cwd(), filePath)}`);
      return;
    }

    // 顺序很重要：必须先把本地文件落盘，再回写 Notion 的 last_fetched_time。
    // 反过来的话，一旦 writeFileSync 失败，Notion 已记录「已同步」，
    // filterToUpdate 会永久跳过该页，本地 .md 再也无法重新生成。
    fs.writeFileSync(filePath, mdContent, "utf-8");

    await this.converter.updateBlogLastFetchedTime(pageId, this.config.lastFetchedTimeProperty);
  }
}