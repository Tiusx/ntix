import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createSlugger } from "./rehype-heading-ids";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export interface PostMeta {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  cover?: string;
}

export interface Post {
  slug: string;
  meta: PostMeta;
}

function normalizeMeta(data: Record<string, unknown>): PostMeta {
  const asString = (value: unknown): string =>
    typeof value === "string" ? value : "";
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  return {
    title: asString(data.title),
    slug: asString(data.slug),
    date: asString(data.date),
    category: asString(data.category),
    tags: asStringArray(data.tags),
    summary: asString(data.summary),
    cover: data.cover ? asString(data.cover) : undefined,
  };
}

function postExists(slug: string): boolean {
  return fs.existsSync(path.join(POSTS_DIR, `${slug}.md`));
}

function readPost(slug: string): Post {
  const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.md`), "utf-8");
  const { data } = matter(raw);
  return { slug, meta: normalizeMeta(data as Record<string, unknown>) };
}

/**
 * 全部文章，按日期倒序。
 * 结果缓存于模块级：静态导出时同一进程会反复调用（分页、分类、标签、
 * sitemap、search-index 各自独立取数），不缓存会重复读盘并重复解析。
 * 内容在构建期间不会变化，dev 下由模块热重载自然失效。
 */
let allPostsCache: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (allPostsCache) return allPostsCache;
  if (!fs.existsSync(POSTS_DIR)) {
    allPostsCache = [];
    return allPostsCache;
  }
  const slugs = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/, ""));

  allPostsCache = slugs
    .map(readPost)
    .filter((post) => post.meta.title && post.meta.date)
    .sort((a, b) => {
      if (a.meta.date === b.meta.date) return 0;
      return a.meta.date < b.meta.date ? 1 : -1;
    });
  return allPostsCache;
}

export function getPostMeta(slug: string): PostMeta | null {
  if (!postExists(slug)) return null;
  return readPost(slug).meta;
}

/** 文章正文（frontmatter 之后的 Markdown 原文），供 RSS 全文输出使用。 */
export function getPostBody(slug: string): string {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return "";
  return matter(fs.readFileSync(file, "utf-8")).content.trim();
}

const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ]/;

/** 去掉 Markdown 语法，得到接近纯文本的内容。 */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~]/g, "");
}

export interface PostStats {
  /** 中文字数 + 英文单词数 */
  count: number;
  /** 预估阅读分钟数，最少 1 */
  minutes: number;
}

/**
 * 统计字数与阅读时长。
 *
 * 中文按 ~350 字/分钟、英文按 ~220 词/分钟估算，两者按实际出现比例混合——
 * 你的文章中英混排很常见，只用单一系数会明显偏差。
 */
export function getPostStats(slug: string): PostStats {
  const text = toPlainText(getPostBody(slug));
  const cjkCount = (text.match(new RegExp(CJK, "g")) ?? []).length;
  const wordCount = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length;
  const minutes = cjkCount / 350 + wordCount / 220;
  return {
    count: cjkCount + wordCount,
    minutes: Math.max(1, Math.round(minutes)),
  };
}

export interface TocEntry {
  depth: 2 | 3;
  text: string;
  /** 与正文锚点 id 一致（见 rehype 插件 rehype-heading-ids） */
  id: string;
}

/** 只取 ATX 标题（# / ## / ###），忽略代码块内的 # 注释行。 */
export function getPostToc(slug: string): TocEntry[] {
  const slugger = createSlugger();
  const body = getPostBody(slug);
  const entries: TocEntry[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`~]/g, "").trim();
    if (!text) continue;
    entries.push({
      depth: m[1].length as 2 | 3,
      text,
      id: slugger.slug(text),
    });
  }
  return entries;
}

/** 目录至少要有这么多条才值得渲染，避免短文出现无意义的折叠块。 */
export const TOC_MIN_ENTRIES = 3;

export function getPostsPage(page: number, pageSize: number): Post[] {
  const all = getAllPosts();
  const start = (page - 1) * pageSize;
  return all.slice(start, start + pageSize);
}

export function getPostPageCount(pageSize: number): number {
  return Math.max(1, Math.ceil(getAllPosts().length / pageSize));
}

export interface SectionEntry {
  name: string;
  count: number;
}

export const CATEGORY_META: Record<string, string> = {
  开发: "用代码、框架与工具构建各种东西。",
  生活: "日常、出行与小确幸。",
  随笔: "快笔记、草稿与零散想法。",
  其他: "放不进其他分类的内容。",
};

/**
 * 分类的唯一注册表——分类是「规划中的 taxonomy」，即使当前 0 篇文章
 * 也会生成页面并出现在 /columns/，因此它（而非文章里实际出现的分类）
 * 才是导航与 sitemap 的依据。
 */
export const CATEGORY_META_KEYS = Object.keys(CATEGORY_META);

export function getCategoryDescription(name: string): string {
  return CATEGORY_META[name] ?? "";
}

export function getPostsCountByCategory(name: string): number {
  return getPostsByCategory(name).length;
}

function aggregate(values: string[][]): SectionEntry[] {
  const counts = new Map<string, number>();
  for (const list of values) {
    for (const value of list) {
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

/**
 * 找出「文章里用了、但没在 CATEGORY_META 注册」的分类。
 * 这类文章不会出现在 /columns/ 与 sitemap 中（导航以注册表为准），
 * 因此构建期必须告警，否则会静默从站点结构中消失。
 */
export function getUnregisteredCategories(): string[] {
  const unregistered = new Set<string>();
  for (const post of getAllPosts()) {
    const category = post.meta.category;
    if (category && !Object.hasOwn(CATEGORY_META, category)) {
      unregistered.add(category);
    }
  }
  return [...unregistered].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function getAllTags(): SectionEntry[] {
  return aggregate(getAllPosts().map((post) => post.meta.tags));
}

export function getPostsByCategory(category: string): Post[] {
  return getAllPosts().filter((post) => post.meta.category === category);
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) => post.meta.tags.includes(tag));
}

export function getPostsByTagPage(tag: string, page: number, pageSize: number): Post[] {
  const all = getPostsByTag(tag);
  const start = (page - 1) * pageSize;
  return all.slice(start, start + pageSize);
}

export function getPostsByTagPageCount(tag: string, pageSize: number): number {
  const all = getPostsByTag(tag);
  return Math.max(1, Math.ceil(all.length / pageSize));
}

export function getPostsByCategoryPage(category: string, page: number, pageSize: number): Post[] {
  const all = getPostsByCategory(category);
  const start = (page - 1) * pageSize;
  return all.slice(start, start + pageSize);
}

export function getPostsByCategoryPageCount(category: string, pageSize: number): number {
  const all = getPostsByCategory(category);
  return Math.max(1, Math.ceil(all.length / pageSize));
}