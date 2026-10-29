/**
 * 站点统一的日期格式化。
 *
 * 全站日期一律按 Asia/Shanghai 呈现：构建可能在任意时区的机器上跑
 * （本地是 +08、CI 通常是 UTC），一旦用 `new Date(iso).getFullYear()`
 * 这类「本地时区」API，纯日期 `2026-01-01` 在 UTC-5 的构建机上会变成
 * 前一年的 12-31，列表和文章页就会互相打架。
 *
 * 这里全部走 Intl + 显式时区，输入相同则输出恒定。
 */

const TIME_ZONE = "Asia/Shanghai";

export interface DateParts {
  year: string;
  month: string;
  day: string;
}

function toParts(iso: string): DateParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? { year, month, day } : null;
}

/** 2026-09-10 —— 文章页 <time> 与 sitemap 风格 */
export function formatDate(iso: string): string {
  const parts = toParts(iso);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : iso;
}

/** 2026.09.10 —— 密集列表 */
export function formatDateDots(iso: string): string {
  const parts = toParts(iso);
  return parts ? `${parts.year}.${parts.month}.${parts.day}` : iso;
}

/** 9.10 —— 不重复年份的紧凑场景 */
export function formatMonthDay(iso: string): string {
  const parts = toParts(iso);
  return parts ? `${Number(parts.month)}.${Number(parts.day)}` : iso;
}

/** 09/10 —— 归档页左侧等宽列 */
export function formatMonthDaySlash(iso: string): string {
  const parts = toParts(iso);
  return parts ? `${parts.month}/${parts.day}` : iso;
}

/** 归档页分组用的年/月；非法日期返回 null。 */
export function getYearMonth(iso: string): { year: number; month: number } | null {
  const parts = toParts(iso);
  if (!parts) return null;
  return { year: Number(parts.year), month: Number(parts.month) };
}
