export type ThemeKey = "nord" | "graphite" | "flax";

export const SITE_CONFIG = {
  avatar: "/avatar.jpg",
  title: "Tiusx",
  description: "于山与月之间，独立写作，记录日常思考。",
  tagline: "独立写作 · 日常思考",
  lang: "zh-CN",
  siteUrl: process.env.SITE_URL || "https://ntix.example.com",
  feedPath: "/rss.xml",
  postsPerPage: 10,
  theme: "graphite" as ThemeKey,
};