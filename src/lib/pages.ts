import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PAGES_DIR = path.join(process.cwd(), "content", "pages");

export interface PageDoc {
  slug: string;
  title: string;
  description: string;
  comment: boolean;
  content: string;
}

function normalizeFrontmatter(data: Record<string, unknown>): {
  title: string;
  description: string;
  comment: boolean;
} {
  return {
    title:
      typeof data.title === "string" ? data.title : "",
    description:
      typeof data.description === "string" ? data.description : "",
    comment: data.comment === "true" || data.comment === true,
  };
}

function readPage(slug: string): PageDoc | null {
  const file = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  if (data.status === "Draft") return null;
  return {
    slug,
    ...normalizeFrontmatter(data as Record<string, unknown>),
    content,
  };
}

let allPagesCache: PageDoc[] | null = null;

/** 缓存理由同 lib/posts.ts：静态导出时同进程会多次取数。 */
export function getAllPages(): PageDoc[] {
  if (allPagesCache) return allPagesCache;
  if (!fs.existsSync(PAGES_DIR)) {
    allPagesCache = [];
    return allPagesCache;
  }
  allPagesCache = fs
    .readdirSync(PAGES_DIR)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/, ""))
    .map((slug) => readPage(slug))
    .filter((page): page is PageDoc => page !== null);
  return allPagesCache;
}

export function getPage(slug: string): PageDoc | null {
  return readPage(slug);
}