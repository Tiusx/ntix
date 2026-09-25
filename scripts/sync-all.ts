#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { parseSyncArgs, formatSyncArgs } from "./lib/cli";

/**
 * 统一同步入口：按顺序同步 memos / Notion posts / Notion pages。
 * 用法（传参透传给子脚本）：
 *   pnpm sync:all             —— memos(全量) + posts(增量) + pages(增量)
 *   pnpm sync:all:strict      —— 同上，任一失败即非零退出（CI）
 *   pnpm sync:all:full        —— memos(全量) + posts(全量) + pages(全量)
 *   pnpm sync:all:full:strict —— 全量 + strict
 *   pnpm sync:all:dry         —— 全程 dry-run，不写任何文件
 */

const args = parseSyncArgs();
const extra = formatSyncArgs({ strict: args.strict, fullSync: args.fullSync, dryRun: args.dryRun });

function run(script: string, flags: string[]): void {
  const label = `tsx ${script}${flags.length ? ` ${flags.join(" ")}` : ""}`;
  console.log(`\n▶ ${label}`);
  // 用数组形式传参，不经 shell 插值
  const res = spawnSync("tsx", [script, ...flags], { stdio: "inherit", shell: false });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`${script} exited with code ${res.status}`);
    (err as NodeJS.ErrnoException).code = String(res.status);
    throw err;
  }
}

let failed = 0;
const steps: Array<[string, string[]]> = [
  // memos 始终全量镜像（仅支持 --strict / --dry-run）
  ["scripts/sync-memos.ts", formatSyncArgs({ strict: args.strict, dryRun: args.dryRun })],
  ["scripts/notion/fetch-posts.ts", extra],
  ["scripts/notion/fetch-pages.ts", extra],
];

for (const [script, flags] of steps) {
  try {
    run(script, flags);
  } catch (error) {
    failed++;
    console.error(
      `\n❌ ${script} 失败：${error instanceof Error ? error.message : String(error)}`,
    );
    // 无 --strict 时容忍失败继续跑完剩余步骤，最后统一以非零退出
    if (args.strict) break;
  }
}

if (failed > 0) {
  console.error(`\n❌ sync:all 完成，但有 ${failed} 个步骤失败。`);
  process.exit(1);
}
console.log("\n🎉 sync:all 全部完成！");