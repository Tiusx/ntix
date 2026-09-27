export const SITE_CONFIG = {
  avatar: "/avatar.jpg",
  title: "Tiusx",
  /** 首页展示用的引言，不是 SEO 描述 */
  description: "照进黑暗中的那束光为救赎",
  /**
   * SEO 用的站点描述，围绕「小石头 / Tius / Tiusx / 技术分享」的品牌词组织。
   *
   * 主力语言取 PHP 与 Golang；刻意不写所在城市与出生年份——
   * 那属于个人信息，放进 meta description 会被各类聚合站直接翻出来，
   * 也不构成任何搜索价值。
   *
   * 长度按「显示宽度」控制（中文/全角标点算 2，ASCII 算 1）：
   * 约 56 个汉字（宽度 112），落在搜索结果不截断的区间。
   */
  metaDescription:
    "小石头（Tiusx）的技术分享博客，主要使用 PHP 与 Golang 进行后端开发，写服务部署、数据库与线上问题排查的踩坑记录。",
  tagline: "凡是过往，皆为序章",
  lang: "zh-CN",
  siteUrl: process.env.SITE_URL || "https://tius.cn",
  feedPath: "/rss.xml",
  postsPerPage: 10,
  /**
   * 站点关键词。
   *
   * ⚠️ <meta name="keywords"> 自 Google 2009 年起已不再用于排名，
   * Bing / 百度同样忽略。保留是因为部分 SEO 工具与社交平台仍会读取，
   * 成本极低，但也别指望它带来流量——真正起作用的是 title 与 description。
   *
   * 前几个是品牌词（搜索者会用「小石头」「Tiusx」直接搜人），
   * 后面才是技术方向与常见主题词。
   */
  keywords: [
    "小石头博客",
    "Tiusx",
    "Tius",
    "小石头",
    "技术分享",
    "技术博客",
    "个人博客",
    "PHP",
    "Golang",
    "Go",
    "后端开发",
    "Docker",
    "Nginx",
    "MySQL",
    "Linux",
    "Cloudflare",
  ],
};
