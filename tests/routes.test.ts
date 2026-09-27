import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  allRoutePaths,
  categoryRoutePaths,
  pageRoutePaths,
  paginatedRoutePaths,
  postRoutePaths,
  routeSignatures,
  staticRoutePaths,
  tagRoutePaths,
} from "@/lib/routes";
import { selectChanged } from "@scripts/lib/indexnow";
import { CATEGORY_META_KEYS, getAllPosts, getAllTags } from "@/lib/posts";
import { SITE_CONFIG } from "@/site.config";

/**
 * 路由清单的唯一来源。
 *
 * 背景：此前 sitemap 与 IndexNow 各维护一份清单，导致 IndexNow 只提交 40 个 URL
 * 而 sitemap 收录 92 个——48 个标签页、分类页与分页页从未被主动推送。
 * 这里断言两者必须完全一致。
 */

const pageSize = SITE_CONFIG.postsPerPage;

describe("路由清单", () => {
  it("全部路由无重复", () => {
    const all = allRoutePaths(pageSize);
    expect(new Set(all).size).toBe(all.length);
  });

  it("全部以 / 开头或以 .xml 结尾", () => {
    for (const p of allRoutePaths(pageSize)) {
      expect(p.startsWith("/"), p).toBe(true);
    }
  });

  it("静态路由不含分页路径", () => {
    for (const p of staticRoutePaths()) {
      expect(p, p).not.toMatch(/\/\d+\/$/);
    }
  });

  it("文章路由与文章数量一致，且都是 posts/", () => {
    expect(postRoutePaths()).toHaveLength(29);
    for (const p of postRoutePaths()) expect(p).toMatch(/^\/posts\/.+\/$/);
  });

  it("分类路由覆盖全部注册分类（taxonomy 模型）", () => {
    expect(categoryRoutePaths()).toHaveLength(CATEGORY_META_KEYS.length);
    for (const c of CATEGORY_META_KEYS) {
      expect(categoryRoutePaths().join()).toContain(encodeURIComponent(c));
    }
  });

  it("标签路由与聚合结果一致", () => {
    expect(tagRoutePaths()).toHaveLength(getAllTags().length);
  });

  it("自定义页路由非空", () => {
    expect(pageRoutePaths().length).toBeGreaterThan(0);
    for (const p of pageRoutePaths()) expect(p).toMatch(/^\/pages\/.+\/$/);
  });

  it("分页从第 2 页开始", () => {
    for (const p of paginatedRoutePaths(pageSize)) {
      const m = p.match(/\/(\d+)\/$/);
      expect(m, p).not.toBeNull();
      expect(Number(m![1]), p).toBeGreaterThanOrEqual(2);
    }
  });

  it("allRoutePaths 是各部分的并集", () => {
    const parts = [
      ...staticRoutePaths(),
      ...postRoutePaths(),
      ...pageRoutePaths(),
      ...categoryRoutePaths(),
      ...tagRoutePaths(),
      ...paginatedRoutePaths(pageSize),
    ];
    expect([...allRoutePaths(pageSize)].sort()).toEqual([...parts].sort());
  });
});

describe("sitemap 与 IndexNow 清单同源", () => {
  const sitemapSource = fs.readFileSync(path.join(process.cwd(), "src/app/sitemap.ts"), "utf-8");

  it("sitemap 不再硬编码静态路由清单", () => {
    // 一旦这里出现 "/archive/" 之类的字面量，就说明又回到了两份清单
    for (const p of staticRoutePaths()) {
      if (p === "/") continue;
      expect(sitemapSource, `sitemap 不应硬编码 ${p}`).not.toContain(`"${p}"`);
    }
  });

  it("sitemap 的各段都取自 lib/routes", () => {
    for (const fn of [
      "postRoutePaths",
      "pageRoutePaths",
      "categoryRoutePaths",
      "tagRoutePaths",
      "paginatedRoutePaths",
    ]) {
      expect(sitemapSource, `sitemap 应使用 ${fn}`).toContain(fn);
    }
    expect(sitemapSource).toContain('from "@/lib/routes"');
  });

  it("sitemap 不自行过滤分页路径（早期正则漏掉了 /blog/2/）", () => {
    expect(sitemapSource).not.toMatch(/\.filter\(\(p\) => \/\^/);
    expect(sitemapSource).not.toMatch(/\\d\+\)\/\$|\\\/\d\+\\\//);
  });

  it("IndexNow 脚本同样取自 lib/routes", () => {
    const submit = fs.readFileSync(
      path.join(process.cwd(), "scripts/submit-indexnow.ts"),
      "utf-8",
    );
    expect(submit).toContain("../src/lib/routes");
    expect(submit).not.toMatch(/STATIC_PATHS/);
  });
});

describe("routeSignatures", () => {
  const sigs = routeSignatures(pageSize);

  it("覆盖全部路由", () => {
    expect(sigs.size).toBe(allRoutePaths(pageSize).length);
  });

  it("每篇文章的指纹取自文件内容且互不相同", () => {
    const postSigs = postRoutePaths().map((p) => sigs.get(p));
    expect(new Set(postSigs).size).toBe(postSigs.length);
    expect(postSigs.every((s) => s?.startsWith("post:"))).toBe(true);
  });

  it("总览页共享同一个汇总指纹", () => {
    const overview = ["/", "/archive/", "/blog/", "/columns/", "/search/", "/memos/"];
    const set = new Set(overview.map((p) => sigs.get(p)));
    expect(set.size).toBe(1);
  });

  it("标签页按归属各自计算，不共用一个指纹", () => {
    // 否则改一篇文章会把 48 个标签页全部重推一遍
    const tagSigs = tagRoutePaths().map((p) => sigs.get(p));
    expect(new Set(tagSigs).size).toBeGreaterThan(1);
  });

  it("分类页同理按归属计算", () => {
    const catSigs = categoryRoutePaths().map((p) => sigs.get(p));
    expect(new Set(catSigs).size).toBeGreaterThan(1);
  });

  it("文章指纹与列表指纹不同（否则无法区分变更来源）", () => {
    expect(sigs.get("/blog/")).not.toBe(sigs.get(postRoutePaths()[0]));
  });

  it("改一篇文章只影响它自己的标签页/分类页", () => {
    const post = getAllPosts()[0];
    const before = routeSignatures(pageSize);
    const ownTags = post.meta.tags.map((t) => `/tags/${encodeURIComponent(t)}/`);
    const foreignTag = tagRoutePaths().find(
      (p) => !ownTags.includes(p) && !p.includes(encodeURIComponent(post.meta.category)),
    );
    // 模拟：只把该文章指纹改掉
    const tampered = new Map(before);
    tampered.set(`/posts/${encodeURIComponent(post.slug)}/`, "post:tampered");
    const { changed } = selectChanged(tampered, Object.fromEntries(before));
    // 自己的标签页签名依赖文章指纹，理应也变；不相关的标签页不应变
    expect(changed).toContain(`/posts/${encodeURIComponent(post.slug)}/`);
    if (foreignTag) expect(changed).not.toContain(foreignTag);
  });
});

describe("selectChanged（只推送变更）", () => {
  const sigs = routeSignatures(pageSize);
  const paths = allRoutePaths(pageSize);

  it("首次全量提交", () => {
    const { changed, removed } = selectChanged(sigs, {});
    expect(changed.sort()).toEqual([...paths].sort());
    expect(removed).toEqual([]);
  });

  it("无变更时不提交任何 URL", () => {
    const previous = Object.fromEntries(sigs);
    const { changed } = selectChanged(sigs, previous);
    expect(changed).toEqual([]);
  });

  it("只提交指纹变化的那一个", () => {
    const previous = Object.fromEntries(sigs);
    const target = paths[3];
    previous[target] = "tampered";
    const { changed } = selectChanged(sigs, previous);
    expect(changed).toEqual([target]);
  });

  it("能识别下线 URL", () => {
    const previous = { ...Object.fromEntries(sigs), "https://tius.cn/gone/": "x" };
    const { changed, removed } = selectChanged(sigs, previous);
    expect(changed).toEqual([]);
    expect(removed).toEqual(["https://tius.cn/gone/"]);
  });
});
