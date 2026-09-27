export const SITE_CONFIG = {
  avatar: "/avatar.jpg",
  title: "Tiusx",
  /** 首页展示用的引言，不是 SEO 描述 */
  description: "照进黑暗中的那束光为救赎",
  /**
   * SEO 用的站点描述。中文建议 40-70 字（对应搜索结果里约 2-3 行）。
   * 刻意与上面的引言分开：那句诗太短，当 description 会被判定为内容单薄。
   */
  metaDescription:
    "Tiusx 的个人技术博客，记录后端与运维实践、部署踩坑、开发工具与生活随笔。文章主要围绕 Linux、Docker、Nginx、MySQL、Cloudflare 等主题。",
  tagline: "凡是过往，皆为序章",
  lang: "zh-CN",
  siteUrl: process.env.SITE_URL || "https://tius.cn",
  feedPath: "/rss.xml",
  postsPerPage: 10,
  /**
   * 站点基础关键词。
   *
   * 注意：<meta name="keywords"> 自 Google 2009 年起已不再用于排名，
   * Bing / 百度同样忽略。此处保留是因为部分 SEO 工具与社交平台仍会读取，
   * 成本极低，但也别指望它带来流量——真正起作用的是 title 与 description。
   */
  keywords: [
    "Tiusx",
    "技术博客",
    "个人博客",
    "开发笔记",
    "运维",
    "后端",
    "Linux",
    "Docker",
    "Nginx",
    "Cloudflare",
  ],
};
