import type { SearchEntry } from "./search-index";

/**
 * 站内搜索的纯逻辑。
 *
 * 抽出来是因为有两个入口：/search/ 页面和全站搜索浮层。两份实现必然会漂移
 * （排序权重不同、摘要截断不同），所以只留这一份。
 */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 高亮命中词，返回可直接注入的 HTML（输入已转义）。 */
export function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escaped = escapeHtml(text);
  const re = new RegExp(`(${safe})`, "gi");
  return escaped.replace(
    re,
    `<mark class="rounded bg-amber-200/60 px-0.5 dark:bg-amber-300/30">$1</mark>`,
  );
}

/** 命中位置附近的片段，避免永远只截开头。 */
export function snippet(text: string, query: string, radius = 60): string {
  if (!query) return text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "");
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  let out = text.slice(start, end);
  if (start > 0) out = "…" + out;
  if (end < text.length) out = out + "…";
  return out;
}

/** 标题 > 分类 > 标签 > 摘要 > 正文，权重递减。 */
export function scoreEntry(entry: SearchEntry, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (entry.title.toLowerCase().includes(q)) score += 10;
  if (entry.category.toLowerCase().includes(q)) score += 5;
  if (entry.tags.some((tag) => tag.toLowerCase().includes(q))) score += 4;
  if (entry.summary.toLowerCase().includes(q)) score += 3;
  if (entry.content.toLowerCase().includes(q)) score += 1;
  return score;
}

export function searchEntries(
  entries: SearchEntry[],
  query: string,
  limit = 20,
): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.date.localeCompare(b.entry.date))
    .map((item) => item.entry)
    .slice(0, limit);
}
