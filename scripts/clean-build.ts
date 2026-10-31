#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isNextDevCommand, isStaleNextBuildCommand } from "./lib/process-match";

/**
 * `pnpm clean` / `pnpm build:clean` 的实现。
 *
 * 解决一个反复出现的实际问题：`next build` 被 Ctrl+C 打断后，残留的 node 进程
 * 仍占着 .next 继续跑，下一次构建会一直等它，表现为「构建卡住」——此前每次都要
 * 去任务管理器里手动找 node.exe。
 *
 * 这里在删缓存之前先结束这些进程。只认 `next build`，不碰 `next dev`
 * （判定逻辑与用例见 scripts/lib/process-match.ts 与 tests/clean-build.test.ts）。
 */

const TARGETS = [".next", ".next-dev", "out"];

interface NodeProcess {
  pid: number;
  command: string;
}

/** 列出所有 node 进程及其命令行；拿不到就返回空数组，不阻断清理。 */
function listNodeProcesses(): NodeProcess[] {
  try {
    if (process.platform === "win32") {
      // 不能直接传 -Command "...": Node 对参数的引号转义会被 PowerShell 误解，
      // 实测会导致 ConvertTo-Json 报 InputObjectNotBound。用 -EncodedCommand
      // 传 UTF-16LE base64，彻底绕开引号问题；输出用制表符分隔，省掉 JSON 解析。
      const script = [
        "$ProgressPreference = 'SilentlyContinue'",
        // PowerShell 5.1 不接受行首的 | ，整条管道必须压在一行里
        [
          "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"",
          "| Where-Object { $_.CommandLine }",
          '| ForEach-Object { "{0}`t{1}" -f $_.ProcessId, $_.CommandLine }',
        ].join(" "),
      ].join("\n");
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      const raw = execFileSync(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        // stderr 默认会继承到终端，PowerShell 的进度流会以 CLIXML 形式刷屏，直接丢弃
        { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
      );

      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const tab = line.indexOf("\t");
          if (tab < 0) return null;
          const pid = Number(line.slice(0, tab));
          return Number.isInteger(pid) && pid > 0
            ? { pid, command: line.slice(tab + 1) }
            : null;
        })
        .filter((row): row is NodeProcess => row !== null);
    }

    const raw = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
    return raw
      .split("\n")
      .map((line) => /^\s*(\d+)\s+(.+)$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({ pid: Number(match[1]), command: match[2] }));
  } catch {
    return [];
  }
}

function killStaleBuilds(processes: NodeProcess[]): number[] {
  const self = new Set([process.pid, process.ppid]);
  const killed: number[] = [];
  for (const proc of processes) {
    if (self.has(proc.pid) || !isStaleNextBuildCommand(proc.command)) continue;
    try {
      process.kill(proc.pid);
      killed.push(proc.pid);
    } catch {
      // 已经退出，或权限不足：忽略，交给后面的删目录重试去暴露问题
    }
  }
  return killed;
}

/** dev server 开着的时候不能抽走 .next-dev，否则正在跑的页面会重新编译甚至崩掉。 */
function isDevRunning(processes: NodeProcess[]): boolean {
  const self = new Set([process.pid, process.ppid]);
  return processes.some((proc) => !self.has(proc.pid) && isNextDevCommand(proc.command));
}

/** 返回是否真的删掉了东西（目录本来就不存在时返回 false）。 */
function removeDir(rel: string): boolean {
  const abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) return false;
  // Windows 上进程刚退出时句柄可能还没释放，rmSync 自带重试
  fs.rmSync(abs, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  return true;
}

async function main(): Promise<void> {
  console.log("🧹 清理构建环境");

  const processes = listNodeProcesses();
  const killed = killStaleBuilds(processes);
  if (killed.length > 0) {
    console.log(`   结束了 ${killed.length} 个残留的 next build 进程：${killed.join(", ")}`);
    // 给系统一点时间释放文件句柄，否则紧跟其后的 rm 可能 EPERM
    await new Promise((resolve) => setTimeout(resolve, 400));
  } else {
    console.log("   没有残留的 next build 进程");
  }

  const devRunning = isDevRunning(processes);
  const targets = devRunning ? TARGETS.filter((dir) => dir !== ".next-dev") : TARGETS;
  if (devRunning) console.log("   检测到 dev server 正在运行，保留 .next-dev");

  const removed: string[] = [];
  for (const dir of targets) {
    try {
      if (removeDir(dir)) removed.push(dir);
    } catch (error) {
      console.error(`✗ 删除 ${dir} 失败：${(error as Error).message}`);
      console.error("  仍有进程占用该目录；重跑一次 pnpm clean，或手动结束对应的 node 进程。");
      process.exit(1);
    }
  }

  console.log(
    removed.length > 0 ? `   已删除：${removed.join("、")}` : "   缓存目录本来就是干净的",
  );
  console.log("✓ 构建环境已就绪\n");
}

main();
