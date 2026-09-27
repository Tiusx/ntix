export const SITE_CONFIG = {
  avatar: "/avatar.jpg",
  title: "Tiusx",
  /** 首页展示用的引言，不是 SEO 描述 */
  description: "照进黑暗中的那束光为救赎",
  /**
   * SEO 用的站点描述，取自 /pages/about/ 的自我介绍。
   * 中文约 60 个汉字（显示宽度 120），正好落在搜索结果不截断的区间；
   * 过短会被判内容单薄，过长则被截断。
   *
   * 技术方向刻意贴合站内实际文章与标签的构成（Linux / Docker / MySQL /
   * Nginx / PHP 居多），而不是把 about 里列了但站内几乎没有内容的 Golang
   * 放在前面——描述要能让访客点进来后看到相符的东西。
   */
  metaDescription:
    "Tius，90 后程序员，现居无锡。写 PHP 与 Python 后端，也常年折腾 Linux、Docker、MySQL、Nginx。十年间踩过的坑，都记在这里。",
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
