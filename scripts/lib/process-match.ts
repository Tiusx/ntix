/**
 * 判断一条命令行是不是「残留的 next build」或「正在跑的 dev server」。
 *
 * 单独抽出来是因为清理脚本要结束进程，误杀 dev server 的代价远大于漏杀。
 * 三个真实踩过的坑：
 * - pnpm 拉起的命令行是 `node "...\next\dist\bin\next" dev`，可执行文件路径
 *   带引号，`next` 后面紧跟的是 `"` 而不是空格，正则必须容忍这个引号；
 * - turbopack 的 dev worker 命令行里同时出现 `.next-dev` 与 `build/chunks`，
 *   用「包含 next 且包含 build」这种粗判会把它一起杀掉；
 * - 清理脚本自己（`tsx scripts/clean-build.ts`）命令行里也带 build。
 * 所以只认「next 后紧跟 build/dev 子命令」这一种形态。
 */
const NEXT_SUBCOMMAND = /\bnext(?:\.cmd)?["']?\s+(build|dev)\b/;

function nextSubcommand(command: string): string | null {
  const match = NEXT_SUBCOMMAND.exec(command);
  return match ? match[1] : null;
}

export function isNextDevCommand(command: string): boolean {
  return Boolean(command) && nextSubcommand(command) === "dev";
}

export function isStaleNextBuildCommand(command: string): boolean {
  if (!command || isNextDevCommand(command)) return false;
  return nextSubcommand(command) === "build";
}
