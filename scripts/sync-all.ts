#!/usr/bin/env tsx

import { execSync } from "node:child_process";

/**
 * 统一同步入口：按顺序同步 memos / Notion posts / Notion pages。
 * 用法（传参透传给子脚本）：
 *   pnpm sync:all             —— memos(全量) + posts(增量) + pages(增量)
 *   pnpm sync:all:strict      —— 同上，任一失败即非零退出（CI）
 *   pnpm sync:all:full        —— memos(全量) + posts(posts:full) + pages(pages:full)
 *   pnpm sync:all:full:strict —— 全量 + strict
 */

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const full = args.includes("--full-sync");

function run(cmd: string): void {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  // memos 始终全量（仅支持 --strict）
  run(`tsx scripts/sync-memos.ts ${strict ? "--strict" : ""}`);
  // posts：增量或全量 + strict
  run(
    `tsx scripts/notion/fetch-posts.ts ${full ? "--full-sync" : ""} ${strict ? "--strict" : ""}`,
  );
  // pages：增量或全量 + strict
  run(
    `tsx scripts/notion/fetch-pages.ts ${full ? "--full-sync" : ""} ${strict ? "--strict" : ""}`,
  );
  console.log("\n🎉 sync:all 全部完成！");
} catch (error) {
  console.error("\n❌ sync:all 失败：", error instanceof Error ? error.message : error);
  process.exit(1);
}