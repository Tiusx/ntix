import { describe, expect, it } from "vitest";
import { formatDate, formatDateDots, formatMonthDay, formatMonthDaySlash, getYearMonth } from "@/lib/date";
import { getAllPosts, getRelatedPosts } from "@/lib/posts";

/**
 * 日期全部按 Asia/Shanghai 呈现：构建机在 UTC 也不能让日期漂移一天。
 */
describe("日期格式化", () => {
  it("纯日期原样输出", () => {
    expect(formatDate("2026-09-10")).toBe("2026-09-10");
  });

  it("UTC 晚 16:30 = 北京次日 00:30", () => {
    expect(formatDate("2025-12-31T16:30:00.000Z")).toBe("2026-01-01");
  });

  it("带 +08:00 偏移时不会倒退", () => {
    expect(formatDate("2026-01-01T00:30:00+08:00")).toBe("2026-01-01");
  });

  it("非法输入原样返回", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("点号与月日两种形态", () => {
    expect(formatDateDots("2026-09-05")).toBe("2026.09.05");
    expect(formatMonthDay("2026-09-05")).toBe("9.5");
    expect(formatMonthDaySlash("2026-09-05")).toBe("09/05");
  });

  it("归档分组取中国时区的年月", () => {
    expect(getYearMonth("2025-12-31T16:30:00.000Z")).toEqual({ year: 2026, month: 1 });
    expect(getYearMonth("bad")).toBeNull();
  });
});

describe("相关文章", () => {
  const posts = getAllPosts();
  const target = posts.find((post) => post.meta.tags.length > 0)!;

  it("不包含自己，且不超过上限", () => {
    const related = getRelatedPosts(target.slug, 5);
    expect(related.length).toBeLessThanOrEqual(5);
    expect(related.some((post) => post.slug === target.slug)).toBe(false);
  });

  it("按相关度非递增排列（相关度不足时才用日期相邻补齐）", () => {
    const related = getRelatedPosts(target.slug, 5);
    const tags = new Set(target.meta.tags);
    const score = (post: (typeof related)[number]) =>
      post.meta.tags.filter((tag) => tags.has(tag)).length * 2 +
      (post.meta.category === target.meta.category ? 1 : 0);
    const scores = related.map(score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("结果不重复", () => {
    const related = getRelatedPosts(target.slug, 5);
    expect(new Set(related.map((post) => post.slug)).size).toBe(related.length);
  });
});
