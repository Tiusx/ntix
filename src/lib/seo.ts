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
