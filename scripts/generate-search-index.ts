import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const OUT_DIR = path.join(process.cwd(), "public");
const OUT_FILE = path.join(OUT_DIR, "search-index.json");

interface SearchEntry {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/~~([^~]*)~~/g, "$1")
    .replace(/--/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`posts dir not found: ${POSTS_DIR}`);
    process.exit(1);
  }

  const entries: SearchEntry[] = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const meta = data as Record<string, unknown>;
      return {
        slug: String(meta.slug || file.replace(/\.md$/, "")),
        title: String(meta.title || ""),
        date: String(meta.date || ""),
        category: String(meta.category || ""),
        tags: Array.isArray(meta.tags)
          ? meta.tags.filter((t): t is string => typeof t === "string")
          : [],
        summary: String(meta.summary || ""),
        content: stripMarkdown(content),
      };
    })
    .filter((entry) => entry.title && entry.content)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(entries), "utf-8");
  console.log(`🔍 生成搜索索引：${entries.length} 篇文章 → public/search-index.json`);
}

main();