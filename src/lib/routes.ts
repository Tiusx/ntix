import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CATEGORY_META_KEYS,
  getAllPosts,
  getAllTags,
  getPostsByCategoryPageCount,
  getPostsByTagPageCount,
} from "./posts";
import { getAllPages } from "./pages";

/**
 * 全站可收录路由的唯一来源。
 *
 * 此前 sitemap（src/app/sitemap.ts）与 IndexNow（scripts/submit-indexnow.ts）
 * 各自维护一份清单，结果 IndexNow 只提交 40 个 URL 而 sitemap 收录 92 个——
 * 48 个标签页、分类页与分页页从未被主动推送。抽出本模块后两者不可能再漂移，
 * tests/routes.test.ts 会断言两者清单完全一致。
 */

const enc = encodeURIComponent;

/** 静态路由（内容随文章变化的列表页也归到 signature 的 listing 组）。 */
export function staticRoutePaths(): string[] {
  return [
    "/",
    "/archive/",
    "/blog/",
    "/categories/",
    "/columns/",
    "/memos/",
    "/search/",
    "/tags/",
    "/rss.xml",
  ];
}

export function postRoutePaths(): string[] {
  return getAllPosts().map((p) => `/posts/${enc(p.slug)}/`);
}

export function pageRoutePaths(): string[] {
  return getAllPages().map((p) => `/pages/${enc(p.slug)}/`);
}

/** 分类页。分类是「规划中的 taxonomy」，即使 0 篇文章也会生成页面。 */
export function categoryRoutePaths(): string[] {
  return CATEGORY_META_KEYS.map((c) => `/categories/${enc(c)}/`);
}

export function tagRoutePaths(): string[] {
  return getAllTags().map((t) => `/tags/${enc(t.name)}/`);
}

/** 分页页：/blog/2/、/categories/<分类>/2/、/tags/<标签>/2/。 */
export function paginatedRoutePaths(pageSize: number): string[] {
  const out: string[] = [];
  const blogPages = Math.ceil(getAllPosts().length / pageSize);
  for (let p = 2; p <= blogPages; p++) out.push(`/blog/${p}/`);

  for (const c of CATEGORY_META_KEYS) {
    const n = getPostsByCategoryPageCount(c, pageSize);
    for (let p = 2; p <= n; p++) out.push(`/categories/${enc(c)}/${p}/`);
  }
  for (const { name } of getAllTags()) {
    const n = getPostsByTagPageCount(name, pageSize);
    for (let p = 2; p <= n; p++) out.push(`/tags/${enc(name)}/${p}/`);
  }
  return out;
}

/** 全部可收录路由。pageSize 决定分页页的数量。 */
export function allRoutePaths(pageSize: number): string[] {
  return [
    ...staticRoutePaths(),
    ...postRoutePaths(),
    ...pageRoutePaths(),
    ...categoryRoutePaths(),
    ...tagRoutePaths(),
    ...paginatedRoutePaths(pageSize),
  ];
}

const sha1 = (input: string): string =>
  createHash("sha1").update(input).digest("hex").slice(0, 16);

function fileHash(file: string): string {
  try {
    return sha1(fs.readFileSync(file, "utf-8"));
  } catch {
    return "missing";
  }
}

/**
 * 每个路由的「内容指纹」，用于只推送新增或更新过的 URL。
 *
 * 指纹按页面实际依赖的内容计算，避免过度提交：
 * - 文章 / 自定义页：对应 markdown 文件的内容哈希
 * - 标签页 / 分类页 / 其分页：该标签（分类）下文章列表的哈希
 * - 首页与 /blog/ 等总览页：全部文章的哈希
 *
 * 这样改一篇文章只会推送「这篇文章 + 它所属的标签页与分类页 + 总览页」，
 * 而不是把所有 48 个标签页一起推一遍。
 */
export function routeSignatures(pageSize: number): Map<string, string> {
  const map = new Map<string, string>();
  const hashOf = (parts: string[]): string =>
    `list:${sha1([...parts].sort().join("|"))}`;

  // 文章与自定义页：文件内容哈希
  for (const p of postRoutePaths()) {
    const slug = decodeURIComponent(p.replace(/^\/posts\//, "").replace(/\/$/, ""));
    map.set(p, `post:${fileHash(path.join(process.cwd(), "content", "posts", `${slug}.md`))}`);
  }
  for (const p of pageRoutePaths()) {
    const slug = decodeURIComponent(p.replace(/^\/pages\//, "").replace(/\/$/, ""));
    map.set(p, `page:${fileHash(path.join(process.cwd(), "content", "pages", `${slug}.md`))}`);
  }

  const posts = getAllPosts();
  const allSigs = posts.map((p) => `${p.slug}:${map.get(`/posts/${enc(p.slug)}/`)}`);

  // 总览页：依赖全部文章
  const globalSig = hashOf(allSigs);
  for (const p of ["/", "/archive/", "/blog/", "/columns/", "/search/", "/memos/"]) {
    map.set(p, globalSig);
  }
  // /rss.xml /categories/ /tags/ 本身是入口页，随内容一起算全局
  for (const p of ["/rss.xml", "/categories/", "/tags/"]) {
    map.set(p, globalSig);
  }
  for (let p = 2; p <= Math.ceil(posts.length / pageSize); p++) {
    map.set(`/blog/${p}/`, globalSig);
  }

  // 分类页：只依赖该分类下的文章
  for (const c of CATEGORY_META_KEYS) {
    const members = posts
      .filter((p) => p.meta.category === c)
      .map((p) => `${p.slug}:${map.get(`/posts/${enc(p.slug)}/`)}`);
    const sig = hashOf(members);
    map.set(`/categories/${enc(c)}/`, sig);
    const n = getPostsByCategoryPageCount(c, pageSize);
    for (let p = 2; p <= n; p++) map.set(`/categories/${enc(c)}/${p}/`, sig);
  }

  // 标签页：只依赖该标签下的文章
  for (const { name } of getAllTags()) {
    const members = posts
      .filter((p) => p.meta.tags.includes(name))
      .map((p) => `${p.slug}:${map.get(`/posts/${enc(p.slug)}/`)}`);
    const sig = hashOf(members);
    map.set(`/tags/${enc(name)}/`, sig);
    const n = getPostsByTagPageCount(name, pageSize);
    for (let p = 2; p <= n; p++) map.set(`/tags/${enc(name)}/${p}/`, sig);
  }

  return map;
}
