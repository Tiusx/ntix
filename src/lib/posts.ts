import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const slugs = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));

  return slugs
    .map(readPost)
    .filter((post) => post.meta.title && post.meta.date)
    .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
}

export function getPostMeta(slug: string): PostMeta | null {
  if (!postExists(slug)) return null;
  return readPost(slug).meta;
}

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

export function getAllCategories(): SectionEntry[] {
  return aggregate(getAllPosts().map((post) => [post.meta.category]));
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