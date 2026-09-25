/** 同步脚本统一的命令行参数解析。 */

export interface SyncArgs {
  /** 失败即非零退出（CI 用） */
  strict: boolean;
  /** 全量同步：清理孤儿文件 */
  fullSync: boolean;
  /** 忽略增量判断，强制重拉全部 */
  force: boolean;
  /** 只打印将要发生的变更，不落盘 */
  dryRun: boolean;
}

export function parseSyncArgs(argv: string[] = process.argv.slice(2)): SyncArgs {
  return {
    strict: argv.includes("--strict"),
    fullSync: argv.includes("--full-sync"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
}

/** 把布尔开关拼成传给子进程的命令行参数。 */
export function formatSyncArgs(args: Partial<SyncArgs>): string[] {
  const out: string[] = [];
  if (args.strict) out.push("--strict");
  if (args.fullSync) out.push("--full-sync");
  if (args.force) out.push("--force");
  if (args.dryRun) out.push("--dry-run");
  return out;
}

/** 人类可读的开关说明，用于 --help。 */
export function syncArgsHelp(): string {
  return [
    "可用参数：",
    "  --strict      失败即非零退出（CI 使用）",
    "  --full-sync   全量同步，清理本地孤儿文件",
    "  --force       忽略增量判断，强制重拉全部条目",
    "  --dry-run     只打印将要发生的变更，不写入磁盘",
  ].join("\n");
}
