/** 退避重试：网络抖动 / 5xx / 429 不应中断整轮同步。 */

export interface RetryOptions {
  /** 最大尝试次数（含首次） */
  attempts?: number;
  /** 基础退避毫秒数，第 n 次失败后等待 base * 2^(n-1) */
  baseDelayMs?: number;
  /** 单次等待上限（毫秒） */
  maxDelayMs?: number;
  /** 判定为「可重试」的错误，默认 true（即全部重试） */
  isRetryable?: (error: unknown) => boolean;
  /** 每次重试前的日志 */
  onRetry?: (error: unknown, attempt: number, waitMs: number) => void;
  /** 标签，用于日志前缀 */
  label?: string;
}

const DEFAULTS = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Notion / Cloudflare 返回的 429 与 5xx 属于瞬时故障，应重试。 */
export function isTransientHttpError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number") return false;
  return status === 429 || status === 408 || (status >= 500 && status < 600);
}

/**
 * 指数退避重试。非 transient HTTP 错误（如 401/404）直接抛出，避免无谓等待。
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = DEFAULTS.attempts,
    baseDelayMs = DEFAULTS.baseDelayMs,
    maxDelayMs = DEFAULTS.maxDelayMs,
    isRetryable = isTransientHttpError,
    onRetry,
    label = "task",
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && isRetryable(error);
      if (!canRetry) {
        if (attempt < attempts) {
          console.error(
            `❌ ${label} failed (non-retryable): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        throw error;
      }
      const waitMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      onRetry?.(error, attempt, waitMs);
      console.warn(
        `⚠️  ${label} 第 ${attempt}/${attempts} 次失败（${
          error instanceof Error ? error.message : String(error)
        }），${waitMs}ms 后重试`,
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}
