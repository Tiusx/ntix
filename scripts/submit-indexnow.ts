#!/usr/bin/env tsx

/**
 * 向 IndexNow (api.indexnow.org) 提交 URL 以加速 Bing / Google 收录。
 *
 * 关键设计：只提交「新增或更新过」的 URL。
 * IndexNow 的语义就是提交变更，重提未变更的 URL 既浪费配额也可能被限流。
 * 变更判定靠内容指纹（src/lib/routes.ts 的 routeSignatures），
 * 指纹存在 .indexnow-state.json；CI 里用 actions/cache 跨运行保留。
 *
 * 路由清单与 sitemap 共用 src/lib/routes.ts，两者不会漂移。
 *
 * 用法：
 *   pnpm submit:indexnow            # 只提交变更的 URL
 *   pnpm submit:indexnow --list     # 打印将要提交的 URL，不发送
 *   pnpm submit:indexnow --all      # 忽略指纹，提交全部 URL
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./notion/utils";
import { withRetry } from "./lib/retry";
import { selectChanged, type IndexNowState } from "./lib/indexnow";
import { allRoutePaths, routeSignatures } from "../src/lib/routes";
import { SITE_CONFIG } from "../src/site.config";

loadEnv();

const DEFAULT_SITE_URL = "https://tius.cn";
const STATE_FILE = path.join(process.cwd(), ".indexnow-state.json");
/** 单次请求最多提交多少 URL（IndexNow 上限为 10000，留足余量）。 */
const BATCH_SIZE = 1000;

function readState(): IndexNowState {
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return typeof parsed === "object" && parsed !== null ? (parsed as IndexNowState) : {};
  } catch {
    return {};
  }
}

/** 原子写，避免中断留下半截 JSON 导致下次误判为「全部变更」。 */
function writeState(state: IndexNowState): void {
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, STATE_FILE);
}

function absolute(paths: string[]): string[] {
  const base = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  return paths.map((p) => `${base}${p === "/" ? "/" : p}`);
}

async function post(urls: string[], key: string): Promise<boolean> {
  const host = new URL(urls[0]).hostname;
  const body = {
    host,
    key,
    keyLocation: `https://${host}/indexnow-key-${key}.txt`,
    urlList: urls,
  };

  const res = await withRetry(
    () =>
      fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      }),
    {
      attempts: 3,
      label: "IndexNow submit",
      // 4xx（除 429）不重试：同一 key 重复提交会 422
      isRetryable: (e) => {
        const status = (e as { status?: number } | null)?.status;
        if (typeof status !== "number") return true;
        return status === 429 || status >= 500;
      },
    },
  );

  if (res.ok || res.status === 202) {
    console.log(`✅ 已提交 ${urls.length} 个 URL → ${host}`);
    return true;
  }
  const text = await res.text().catch(() => "");
  console.error(`❌ 提交失败 HTTP ${res.status}: ${text}`);
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list") || args.includes("--dry-run");
  const forceAll = args.includes("--all");

  const pageSize = SITE_CONFIG.postsPerPage;
  const signatures = routeSignatures(pageSize);
  const allPaths = allRoutePaths(pageSize);
  const previous = readState();

  if (signatures.size !== allPaths.length) {
    console.warn(
      `⚠️  指纹数(${signatures.size})与路由数(${allPaths.length})不一致，按全量提交处理`,
    );
  }

  const { changed, removed } = forceAll
    ? { changed: allPaths, removed: Object.keys(previous) }
    : selectChanged(signatures, previous);

  console.log(`🔗 可收录路由 ${allPaths.length} 个，其中新增或更新 ${changed.length} 个`);
  if (removed.length > 0) console.log(`   已下线 ${removed.length} 个（不再提交）`);

  if (changed.length === 0) {
    console.log("✅ 无变更，无需提交");
    return;
  }

  const urls = absolute(changed);

  if (listOnly) {
    console.log("\n--- 将提交的 URL ---");
    for (const u of urls) console.log(u);
    console.log(`--- 共 ${urls.length} 个（--list 未发送）---`);
    return;
  }

  const key = process.env.INDEXNOW_KEY || "";
  if (!key) {
    console.error("⚠️  缺少 INDEXNOW_KEY，跳过提交。");
    console.error("   本地：写进 .env.local；CI：必须是 GitHub Actions Secret，否则该步骤会被静默跳过。");
    process.exitCode = 1;
    return;
  }

  let allOk = true;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    if (!(await post(batch, key))) {
      allOk = false;
      break;
    }
  }

  if (!allOk) {
    console.error("❌ 提交未全部成功，保留旧状态以便下次重试这些 URL");
    process.exitCode = 1;
    return;
  }

  // 提交成功才推进状态，否则下次仍会重试
  writeState(Object.fromEntries(signatures));
  console.log(`💾 已更新 ${STATE_FILE.replace(process.cwd() + path.sep, "")}`);
}

main();
