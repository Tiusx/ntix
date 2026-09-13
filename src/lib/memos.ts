import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const MEMOS_DIR = path.join(process.cwd(), "content", "memos");

export interface MemoAttachment {
  name: string;
  filename: string;
  externalLink: string;
  type: string;
  size: string;
}

export interface MemoLocation {
  placeholder: string;
  latitude: number;
  longitude: number;
}

export interface Memo {
  slug: string;
  content: string;
  date: string;
  tags: string[];
  pinned: boolean;
  attachments: MemoAttachment[];
  location?: MemoLocation;
}

function normalizeMemo(data: Record<string, unknown>): Omit<Memo, "content"> {
  const asString = (value: unknown): string =>
    typeof value === "string" ? value : "";
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  const asAttachments = (value: unknown): MemoAttachment[] =>
    Array.isArray(value)
      ? value.filter(
          (item): item is MemoAttachment =>
            typeof item === "object" && item !== null && "externalLink" in item,
        )
      : [];
  const asLocation = (value: unknown): MemoLocation | undefined => {
    if (
      typeof value === "object" &&
      value !== null &&
      "placeholder" in value &&
      "latitude" in value &&
      "longitude" in value
    ) {
      const loc = value as Record<string, unknown>;
      if (
        typeof loc.placeholder === "string" &&
        typeof loc.latitude === "number" &&
        typeof loc.longitude === "number"
      ) {
        return {
          placeholder: loc.placeholder,
          latitude: loc.latitude,
          longitude: loc.longitude,
        };
      }
    }
    return undefined;
  };

  return {
    slug: asString(data.slug),
    date: asString(data.date),
    tags: asStringArray(data.tags),
    pinned: Boolean(data.pinned),
    attachments: asAttachments(data.attachments),
    location: asLocation(data.location),
  };
}

function readMemo(slug: string): Memo {
  const raw = fs.readFileSync(path.join(MEMOS_DIR, `${slug}.md`), "utf-8");
  const { data, content } = matter(raw);
  return { ...normalizeMemo(data as Record<string, unknown>), content };
}

export function getAllMemos(): Memo[] {
  if (!fs.existsSync(MEMOS_DIR)) return [];
  const slugs = fs
    .readdirSync(MEMOS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));

  return slugs
    .map(readMemo)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getMemosPage(page: number, pageSize: number): Memo[] {
  const all = getAllMemos();
  const start = (page - 1) * pageSize;
  return all.slice(start, start + pageSize);
}

export function getMemosPageCount(pageSize: number): number {
  return Math.max(1, Math.ceil(getAllMemos().length / pageSize));
}

export function getAllMemoTags(): string[] {
  const seen = new Set<string>();
  for (const memo of getAllMemos()) {
    for (const tag of memo.tags) {
      if (tag) seen.add(tag);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function getMemosByTag(tag: string): Memo[] {
  return getAllMemos().filter((memo) => memo.tags.includes(tag));
}

export function getMemosByTagPage(
  tag: string,
  page: number,
  pageSize: number,
): Memo[] {
  const all = getMemosByTag(tag);
  const start = (page - 1) * pageSize;
  return all.slice(start, start + pageSize);
}

export function getMemosByTagPageCount(tag: string, pageSize: number): number {
  return Math.max(1, Math.ceil(getMemosByTag(tag).length / pageSize));
}