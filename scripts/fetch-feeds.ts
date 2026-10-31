#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { collectFeeds } from "../src/lib/feeds";
import { FEED_SOURCES } from "../src/feeds.config";

/**
 * 构建期抓一份友圈快照到 public/feeds.json。
 *
 * 它不是主数据源（线上由 functions/api/feeds.ts 实时抓），用途有两个：
 * 1. 函数不可用 / 冷启动失败时，页面能退回到这份静态快照；
 * 2. 本地 `next dev` 没有 Pages Functions，开发时页面就靠它。
 *
 * 全部源都失败且已有旧快照时直接保留旧的——和 sync-memos 的策略一致，
 * 网络问题不该让构建产出空页面。
 */

const OUT = path.join(process.cwd(), "public", "feeds.json");

async function main(): Promise<void> {
  const payload = await collectFeeds(FEED_SOURCES);
  const healthy = payload.sources.filter((source) => !source.error);

  if (payload.items.length === 0 && fs.existsSync(OUT)) {
    console.log("🔗 友圈：所有源都抓取失败，保留上次快照");
    return;
  }

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `🔗 友圈快照：${payload.items.length} 篇 / ${healthy.length}/${payload.sources.length} 个源 → public/feeds.json`,
  );
  for (const source of payload.sources) {
    if (source.error) console.log(`   ✗ ${source.name}: ${source.error}`);
  }
}

main();
