import type { Metadata } from "next";
import { SITE_CONFIG } from "@/site.config";

/**
 * RSS 自动发现所需的 link rel=alternate。
 *
 * 必须逐页带上：Next 的 metadata 是「整体替换」而非深合并，
 * 任何页面只要自己写了 alternates（例如只写 canonical），
 * 根 layout 里的 RSS types 就会被覆盖掉。
 */
const RSS_TYPES = {
  "application/rss+xml": [{ url: SITE_CONFIG.feedPath, title: `${SITE_CONFIG.title} · RSS` }],
};

/** 无 canonical 需求时使用（例如首页）。 */
export const withRss = (): NonNullable<Metadata["alternates"]> => ({
  types: RSS_TYPES,
});

/** 有 canonical 时使用：canonical 与 RSS 自动发现一起输出。 */
export const withRssCanonical = (canonical: string): NonNullable<Metadata["alternates"]> => ({
  canonical,
  types: RSS_TYPES,
});

/**
 * 站点默认分享卡片（public/og/default.png，由 scripts/generate-og.tsx 在 prebuild 生成）。
 *
 * 页面一旦自己声明 openGraph，就会屏蔽从祖先继承的 opengraph-image 文件约定，
 * 所以凡是自定义了 openGraph 的页面都必须显式带上这个 images。
 * tests/seo.test.ts 会检查构建产物里每个页面都有 og:image，防止漏加。
 */
export const OG_DEFAULT_IMAGE = "/og/default.png";

export const ogDefaultImage = () => ({
  url: OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: SITE_CONFIG.title,
});

/**
 * 拼装 <meta name="keywords">。
 *
 * ⚠️ 重要前提：keywords 自 Google 2009 年起就不再参与排名，Bing / 百度同样忽略。
 * 保留它是因为部分 SEO 审计工具与社交平台仍会读取，成本极低；
 * 但真正影响搜索结果的是 title 与 description，不要在这里花太多精力。
 *
 * 页面级关键词应传入「该页特有的词」（文章标签、分类名、标签名），
 * 站点基础词由本函数自动带上。
 */
export const buildKeywords = (extra: string[] = []): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of [...extra, ...SITE_CONFIG.keywords]) {
    const t = k.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
};

/** 文章页关键词：分类 + 标签 + 站点词。 */
export const postKeywords = (category: string, tags: string[]): string[] =>
  buildKeywords([...tags, category].filter(Boolean));

/**
 * SEO 描述的中文长度建议区间。
 * 搜索结果通常展示 50-60 个全角字符左右，过短会被判内容单薄，
 * 过长则会被截断——两者都不利于点击率。
 */
export const DESCRIPTION_MIN = 40;
export const DESCRIPTION_MAX = 160;

/** 描述过短时回退到站点描述，避免输出明显单薄的 meta。 */
export const descriptionOrSite = (desc: string | undefined): string => {
  const t = (desc ?? "").trim();
  return t.length >= DESCRIPTION_MIN ? t : SITE_CONFIG.metaDescription;
};
