import { describe, expect, it } from "vitest";
import { escapeHtml, highlight, scoreEntry, searchEntries, snippet } from "@/lib/search";
import type { SearchEntry } from "@/lib/search-index";

const entry = (over: Partial<SearchEntry>): SearchEntry => ({
  slug: over.slug ?? "s",
  title: over.title ?? "标题",
  date: over.date ?? "2026-01-01",
  category: over.category ?? "开发",
  tags: over.tags ?? [],
  summary: over.summary ?? "",
  content: over.content ?? "",
});

/**
 * /search/ 页面与全站浮层共用这套逻辑，权重一旦走样两边就会给出不同结果。
 */
describe("searchEntries", () => {
  const entries = [
    entry({ slug: "a", title: "MySQL 行锁排查", content: "无关内容" }),
    entry({ slug: "b", title: "Nginx 配置", content: "这里提到了 mysql 但不是标题", tags: [] }),
    entry({ slug: "c", title: "随笔", tags: ["mysql"] }),
  ];

  it("标题命中排最前，纯正文命中排最后", () => {
    // a=标题命中(10) > c=标签命中(4) > b=正文命中(1)
    expect(searchEntries(entries, "mysql").map((e) => e.slug)).toEqual(["a", "c", "b"]);
  });

  it("空查询返回空数组", () => {
    expect(searchEntries(entries, "   ")).toEqual([]);
  });

  it("遵守 limit", () => {
    expect(searchEntries(entries, "mysql", 1)).toHaveLength(1);
  });

  it("完全不命中时返回空", () => {
    expect(searchEntries(entries, "redis")).toEqual([]);
  });

  it("标签命中有权重（不低于纯正文命中）", () => {
    expect(scoreEntry(entries[2], "mysql")).toBeGreaterThan(scoreEntry(entries[1], "redis"));
  });
});

describe("highlight / snippet", () => {
  it("转义 HTML，避免注入", () => {
    expect(escapeHtml("<img src=x>")).toBe("&lt;img src=x&gt;");
  });

  it("高亮时先转义再包 mark", () => {
    const html = highlight("a<b>c", "b");
    expect(html).toBe("a&lt;<mark class=\"rounded bg-amber-200/60 px-0.5 dark:bg-amber-300/30\">b</mark>&gt;c");
  });

  it("摘要围绕命中位置截取", () => {
    const text = "前面一大段无关内容".repeat(10) + "关键词" + "后面一大段".repeat(10);
    const out = snippet(text, "关键词", 10);
    expect(out).toContain("关键词");
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
  });
});
