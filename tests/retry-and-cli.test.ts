import { describe, expect, it, vi } from "vitest";
import { withRetry, isTransientHttpError } from "@scripts/lib/retry";
import { parseSyncArgs, formatSyncArgs } from "@scripts/lib/cli";

function httpError(status: number): Error & { status: number } {
  const e = new Error(`HTTP ${status}`) as Error & { status: number };
  e.status = status;
  return e;
}

describe("isTransientHttpError", () => {
  it("把 429 / 5xx 视为瞬时故障", () => {
    expect(isTransientHttpError(httpError(429))).toBe(true);
    expect(isTransientHttpError(httpError(500))).toBe(true);
    expect(isTransientHttpError(httpError(503))).toBe(true);
  });

  it("把 4xx（除 429）与无 status 的错误视为不可重试", () => {
    expect(isTransientHttpError(httpError(401))).toBe(false);
    expect(isTransientHttpError(httpError(403))).toBe(false);
    expect(isTransientHttpError(httpError(404))).toBe(false);
    expect(isTransientHttpError(new Error("boom"))).toBe(false);
    expect(isTransientHttpError(null)).toBe(false);
  });
});

describe("withRetry", () => {
  it("首次成功时不重试", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("瞬时错误会重试并最终成功", async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw httpError(429);
        return "ok";
      },
      { attempts: 4, baseDelayMs: 1 },
    );
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("退避序列按指数增长", async () => {
    const waits: number[] = [];
    await withRetry(
      async () => {
        throw httpError(500);
      },
      {
        attempts: 4,
        baseDelayMs: 1,
        onRetry: (_e, _a, waitMs) => waits.push(waitMs),
      },
    ).catch(() => {});
    expect(waits).toEqual([1, 2, 4]);
  });

  it("退避时长受 maxDelayMs 限制", async () => {
    const waits: number[] = [];
    await withRetry(
      async () => {
        throw httpError(500);
      },
      {
        attempts: 5,
        baseDelayMs: 10,
        maxDelayMs: 25,
        onRetry: (_e, _a, waitMs) => waits.push(waitMs),
      },
    ).catch(() => {});
    expect(waits).toEqual([10, 20, 25, 25]);
  });

  it("不可重试的错误立即抛出，不浪费重试", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw httpError(401);
        },
        { attempts: 4, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("HTTP 401");
    expect(calls).toBe(1);
  });

  it("耗尽 attempts 后抛出最后一次错误", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          const e = new Error(`fail-${calls}`) as Error & { status: number };
          e.status = 500;
          throw e;
        },
        { attempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("fail-3");
    expect(calls).toBe(3);
  });
});

describe("parseSyncArgs", () => {
  it("默认全 false", () => {
    expect(parseSyncArgs([])).toEqual({
      strict: false,
      fullSync: false,
      force: false,
      dryRun: false,
    });
  });

  it("识别全部开关", () => {
    expect(parseSyncArgs(["--strict", "--full-sync", "--force", "--dry-run"])).toEqual({
      strict: true,
      fullSync: true,
      force: true,
      dryRun: true,
    });
  });

  it("忽略未知参数", () => {
    expect(parseSyncArgs(["--nope", "--strict"]).strict).toBe(true);
  });
});

describe("formatSyncArgs", () => {
  it("只为 true 的开关产出参数", () => {
    expect(formatSyncArgs({})).toEqual([]);
    expect(formatSyncArgs({ strict: true, dryRun: true })).toEqual(["--strict", "--dry-run"]);
  });

  it("与 parseSyncArgs 往返一致", () => {
    const argv = ["--strict", "--full-sync", "--dry-run"];
    expect(formatSyncArgs(parseSyncArgs(argv)).sort()).toEqual(argv.sort());
  });
});
