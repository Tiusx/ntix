#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
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

/**
 * 解析 tsx 的真实入口，用 node 直接执行。
 *
 * 不能 spawnSync("tsx", ...)：pnpm 在 Windows 上生成的是 tsx.CMD 批处理 shim，
 * 不经 shell 无法执行，会报 ENOENT（Linux 上则能跑，属于平台相关的隐蔽失败）。
 * 走 process.execPath + 解析出的 cli.mjs 在各平台行为一致，且不需要 shell。
 */
const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

function run(script: string, flags: string[]): void {
  const label = `tsx ${script}${flags.length ? ` ${flags.join(" ")}` : ""}`;
  console.log(`\n▶ ${label}`);
  const res = spawnSync(process.execPath, [TSX_CLI, script, ...flags], {
    stdio: "inherit",
    shell: false,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`${script} exited with code ${res.status}`) as Error & {
      code?: string;
    };
    err.code = String(res.status);
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
  process.exitCode = 1;
}
console.log("\n🎉 sync:all 全部完成！");
