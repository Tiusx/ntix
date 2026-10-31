import { XMLParser } from "fast-xml-parser";

/**
 * 友圈 RSS 的解析与抓取。
 *
 * 这一层刻意不依赖 Next / Node 专有 API：同一份代码要给三处用——
 * - `functions/api/feeds.ts`（Cloudflare Pages Function，线上实时数据）
 * - `scripts/fetch-feeds.ts`（构建期快照，作为兜底与本地开发数据）
 * - `src/components/feed-reader.tsx`（只消费类型）
 *
 * 解析用 fast-xml-parser 而不是正则：RSS 2.0 与 Atom 的字段结构完全不同
 * （item/link 字符串 vs entry/link 属性），正则拼不出可靠结果。
 */

export interface FeedSource {
  name: string;
  site: string;
  feed: string;
  avatar?: string;
}

export interface FeedItem {
  title: string;
  link: string;
  /** ISO 时间；解析失败时为空串，排序时沉底 */
  date: string;
  excerpt: string;
  source: string;
  sourceUrl: string;
  /** 站点头像：优先取配置里指定的，其次取 feed 的 icon/logo */
  avatar?: string;
  /**
   * 正文里的配图，已绝对化、去重，最多 MAX_IMAGES 张。
   *
   * 来源有三处：content:encoded / description 的 <img>、enclosure、
   * media:content。没有就是空数组，前端不渲染图片区。
   */
  images?: string[];
}

/** 九宫格上限：再多就不适合在信息流里展开了。 */
export const MAX_IMAGES = 6;

export interface FeedSourceStatus {
  name: string;
  site: string;
  count: number;
  error?: string;
}

export interface FeedPayload {
  updatedAt: string;
  items: FeedItem[];
  sources: FeedSourceStatus[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#cdata",
  trimValues: true,
  // 保持字符串：否则 "2026" 这类标题会被转成数字
  parseTagValue: false,
});

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const value = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** 取节点文本：兼容字符串、CDATA 包装、Atom 的 #text。 */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = textOf(entry);
      if (text) return text;
    }
    return "";
  }
  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return textOf(node["#cdata"] ?? node["#text"] ?? "");
  }
  return "";
}

function absolutize(link: string, base: string): string {
  try {
    return new URL(link, base).href;
  } catch {
    return link;
  }
}

/** Atom 的 link 是属性数组，RSS 的是文本，这里统一取 alternate。 */
function linkOf(value: unknown, base: string): string {
  const list = Array.isArray(value) ? value : [value];
  for (const candidate of list) {
    if (typeof candidate === "string" && candidate.trim()) return absolutize(candidate.trim(), base);
    if (candidate && typeof candidate === "object") {
      const node = candidate as Record<string, unknown>;
      const rel = typeof node["@_rel"] === "string" ? node["@_rel"] : "alternate";
      const href = node["@_href"];
      if (rel === "alternate" && typeof href === "string" && href.trim()) {
        return absolutize(href.trim(), base);
      }
    }
  }
  for (const candidate of list) {
    if (candidate && typeof candidate === "object") {
      const href = (candidate as Record<string, unknown>)["@_href"];
      if (typeof href === "string" && href.trim()) return absolutize(href.trim(), base);
    }
  }
  return "";
}

/** 剥标签 + 解实体 + 压空白。先剥再解，避免 &lt;script&gt; 被还原成活标签。 */
export function toPlainText(input: string): string {
  if (!input) return "";
  return decodeEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max: number): string {
  const chars = [...input];
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : input;
}

function isoDate(value: unknown): string {
  const raw = textOf(value);
  if (!raw) return "";
  const time = Date.parse(raw);
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const IMG_SRC = /<img\b[^>]*?\b(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/gi;

/** 常见的小图标 / 表情路径，不是正文配图，抓进来只会占满九宫格。 */
const ICON_HINT = /\/(emoji|emojis|smiley|smilies|avatar|gravatar|icon|icons|logo|badge)\//i;

/**
 * 从一条 entry 里抽出配图。
 *
 * RSS 的图片没有统一字段：WordPress 放在 content:encoded 的 <img> 里，
 * 播客/图站用 enclosure，Atom 用 media:content。三处都翻一遍，取到 6 张为止。
 */
function imagesOf(node: Record<string, unknown>, base: string): string[] {
  const raw: string[] = [];

  for (const key of ["content:encoded", "content", "description", "summary"]) {
    // 有的源用 CDATA 原样塞 HTML，有的把 < 转义成 &lt;，先解实体再匹配
    const html = decodeEntities(textOf(node[key]));
    if (!html) continue;
    for (const match of html.matchAll(IMG_SRC)) {
      if (match[1]) raw.push(match[1]);
    }
  }

  for (const key of ["enclosure", "media:content", "media:thumbnail"]) {
    const value = node[key];
    const list = Array.isArray(value) ? value : [value];
    for (const entry of list) {
      if (!entry || typeof entry !== "object") continue;
      const attrs = entry as Record<string, unknown>;
      const url = attrs["@_url"] ?? attrs["@_href"];
      const type = String(attrs["@_type"] ?? "");
      if (typeof url === "string" && url.trim() && (!type || type.startsWith("image/"))) {
        raw.push(url);
      }
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    if (out.length >= MAX_IMAGES) break;
    const url = absolutize(candidate.trim(), base);
    if (!/^https?:\/\//i.test(url)) continue;
    if (ICON_HINT.test(url)) continue;
    const key = url.split("#")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/**
 * 解析单个 feed。
 *
 * 支持 RSS 2.0、RDF (RSS 1.0) 与 Atom 三种形态；标题为空时退回域名，
 * 保证列表里不会出现一条无法辨认的空白项。
 */
export function parseFeed(xml: string, source: FeedSource, perSource = 12): FeedItem[] {
  let document: Record<string, unknown>;
  try {
    document = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  const rss = document.rss as Record<string, unknown> | undefined;
  const rdf = document["rdf:RDF"] as Record<string, unknown> | undefined;
  const atom = document.feed as Record<string, unknown> | undefined;

  const channel = (rss?.channel ?? rdf?.channel) as Record<string, unknown> | undefined;
  const rawItems = channel ? channel.item : atom?.entry;
  const entries = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  // 站点头像：Atom 用 icon/logo，RSS 用 image.url。没有就留空，前端用首字兜底。
  const channelImage = channel?.image as Record<string, unknown> | undefined;
  const feedAvatar = textOf(atom?.icon ?? atom?.logo ?? channelImage?.url ?? "");
  const avatar = source.avatar || feedAvatar || undefined;

  const items: FeedItem[] = [];
  for (const entry of entries.slice(0, perSource)) {
    if (!entry || typeof entry !== "object") continue;
    const node = entry as Record<string, unknown>;

    const link = linkOf(node.link, source.site) || (typeof node.id === "string" ? node.id : "");
    if (!link) continue;

    const title = toPlainText(textOf(node.title)) || hostOf(link);
    const excerpt = truncate(
      toPlainText(
        textOf(node.description ?? node.summary ?? node.content ?? node["content:encoded"]),
      ),
      110,
    );

    const images = imagesOf(node, link);

    items.push({
      title,
      link,
      date: isoDate(
        node.pubDate ?? node.published ?? node.updated ?? node["dc:date"] ?? node.date ?? node.created,
      ),
      excerpt,
      source: source.name,
      sourceUrl: source.site,
      avatar,
      ...(images.length > 0 ? { images } : {}),
    });
  }
  return items;
}

/** 去重（按链接）+ 按时间倒序 + 截断。 */
export function mergeItems(items: FeedItem[], limit = 80): FeedItem[] {
  const seen = new Set<string>();
  const unique: FeedItem[] = [];
  for (const item of items) {
    const key = item.link.split("#")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return unique.slice(0, limit);
}

const FETCH_TIMEOUT = 8000;

async function fetchOne(source: FeedSource, perSource: number): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(source.feed, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "user-agent": "TiusxFeedReader/1.0 (+https://tius.cn/)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseFeed(await response.text(), source, perSource);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 并发抓取全部源。单个源失败只记在 sources 里，不影响其它源；
 * `Promise.allSettled` 是为了让「一个站挂掉整页空白」不再发生。
 */
export async function collectFeeds(
  sources: FeedSource[],
  perSource = 12,
): Promise<FeedPayload> {
  const results = await Promise.allSettled(sources.map((source) => fetchOne(source, perSource)));

  const items: FeedItem[] = [];
  const status: FeedSourceStatus[] = sources.map((source, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      items.push(...result.value);
      return { name: source.name, site: source.site, count: result.value.length };
    }
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return { name: source.name, site: source.site, count: 0, error: reason };
  });

  return {
    updatedAt: new Date().toISOString(),
    items: mergeItems(items),
    sources: status,
  };
}
