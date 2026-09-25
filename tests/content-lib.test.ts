import { describe, expect, it } from "vitest";
import {
  CATEGORY_META,
  CATEGORY_META_KEYS,
  getAllPosts,
  getAllTags,
  getCategoryDescription,
  getPostPageCount,
  getPostsByCategory,
  getPostsByTag,
  getPostsPage,
  getUnregisteredCategories,
} from "@/lib/posts";
import { getAllMemos, getMemosPage, getMemosPageCount, getMemosByTag } from "@/lib/memos";
import { getAllPages, getPage } from "@/lib/pages";

/**
 * 针对仓库真实 content/ 的断言。
 * 这些是「导航以 CATEGORY_META 注册表为准」这一 taxonomy 模型的护栏。
 */
describe("posts 内容读取", () => {
  const posts = getAllPosts();

  it("读到非空文章列表", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("按日期倒序", () => {
    const dates = posts.map((p) => p.meta.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("全部文章都有 title / date / slug", () => {
    for (const p of posts) {
      expect(p.meta.title, `slug=${p.meta.slug}`).toBeTruthy();
      expect(p.meta.date, `slug=${p.meta.slug}`).toBeTruthy();
      expect(p.meta.slug, `slug=${p.meta.slug}`).toBeTruthy();
    }
  });

  it("排除 _ 前缀的构建占位文件", () => {
    expect(posts.some((p) => p.slug.startsWith("_"))).toBe(false);
  });

  it("getAllPosts 返回缓存引用（避免同一次构建内重复读盘）", () => {
    expect(getAllPosts()).toBe(posts);
  });
});

describe("分页", () => {
  const pageSize = 10;

  it("分页覆盖全部文章且不重复", () => {
    const all = getAllPosts();
    const pageCount = getPostPageCount(pageSize);
    const collected: string[] = [];
    for (let p = 1; p <= pageCount; p++) {
      collected.push(...getPostsPage(p, pageSize).map((x) => x.meta.slug));
    }
    expect(collected).toEqual(all.map((x) => x.meta.slug));
  });

  it("页数至少为 1", () => {
    expect(getPostPageCount(pageSize)).toBeGreaterThanOrEqual(1);
  });

  it("越界页返回空数组", () => {
    const pageCount = getPostPageCount(pageSize);
    expect(getPostsPage(pageCount + 1, pageSize)).toEqual([]);
  });
});

describe("分类 taxonomy（规划中的 taxonomy 模型）", () => {
  it("CATEGORY_META_KEYS 与 CATEGORY_META 一致", () => {
    expect(CATEGORY_META_KEYS).toEqual(Object.keys(CATEGORY_META));
  });

  it("每个注册分类都有非空描述", () => {
    for (const key of CATEGORY_META_KEYS) {
      expect(getCategoryDescription(key), `分类 ${key}`).toBeTruthy();
    }
  });

  it("未注册分类返回空描述", () => {
    expect(getCategoryDescription("不存在的分类")).toBe("");
  });

  it("当前仓库没有未注册分类（否则构建期会告警）", () => {
    expect(getUnregisteredCategories()).toEqual([]);
  });

  it("所有文章的分类都已注册", () => {
    for (const post of getAllPosts()) {
      expect(
        Object.hasOwn(CATEGORY_META, post.meta.category),
        `文章 ${post.meta.slug} 的分类「${post.meta.category}」未注册到 CATEGORY_META`,
      ).toBe(true);
    }
  });

  it("getPostsByCategory 对 0 文章的注册分类返回空数组而非报错", () => {
    const empty = CATEGORY_META_KEYS.find((k) => getPostsByCategory(k).length === 0);
    if (empty) {
      expect(getPostsByCategory(empty)).toEqual([]);
    } else {
      // 当前每个注册分类都有文章，断言至少覆盖了一个分类
      expect(CATEGORY_META_KEYS.length).toBeGreaterThan(0);
    }
  });
});

describe("标签", () => {
  it("按文章数倒序聚合", () => {
    const tags = getAllTags();
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i - 1].count).toBeGreaterThanOrEqual(tags[i].count);
    }
  });

  it("同名标签计数正确", () => {
    const expected = getAllPosts().filter((p) => p.meta.tags.includes("Memos")).length;
    expect(getPostsByTag("Memos")).toHaveLength(expected);
  });

  it("不存在的标签返回空数组", () => {
    expect(getPostsByTag("__不存在的标签__")).toEqual([]);
  });
});

describe("memos 内容读取", () => {
  const memos = getAllMemos();

  it("读到非空 memos", () => {
    expect(memos.length).toBeGreaterThan(0);
  });

  it("按日期倒序", () => {
    const dates = memos.map((m) => m.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("分页覆盖全部 memos", () => {
    const pageSize = 20;
    const collected: string[] = [];
    for (let p = 1; p <= getMemosPageCount(pageSize); p++) {
      collected.push(...getMemosPage(p, pageSize).map((m) => m.slug));
    }
    expect(collected).toEqual(memos.map((m) => m.slug));
  });

  it("附件被规范化为数组", () => {
    for (const m of memos) {
      expect(Array.isArray(m.attachments)).toBe(true);
      expect(Array.isArray(m.tags)).toBe(true);
    }
  });

  it("标签过滤可用", () => {
    const firstTag = memos.find((m) => m.tags.length > 0)?.tags[0];
    if (firstTag) {
      expect(getMemosByTag(firstTag).length).toBeGreaterThan(0);
    }
  });
});

describe("pages 内容读取", () => {
  it("读到非空页面", () => {
    expect(getAllPages().length).toBeGreaterThan(0);
  });

  it("Draft 状态视为不存在", () => {
    for (const p of getAllPages()) {
      expect(p).not.toHaveProperty("status", "Draft");
    }
  });

  it("getPage 能按 slug 取到内容", () => {
    const first = getAllPages()[0];
    expect(getPage(first.slug)?.content).toBe(first.content);
  });

  it("不存在的 slug 返回 null", () => {
    expect(getPage("__不存在__")).toBeNull();
  });
});
