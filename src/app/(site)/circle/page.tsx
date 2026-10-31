import type { Metadata } from "next";
import { FeedReader } from "@/components/feed-reader";
import { buildKeywords, withRssCanonical } from "@/lib/seo";

/**
 * 友圈。
 *
 * 页面本身是静态的，文章列表由 /api/feeds（Pages Function）在客户端拉取：
 * 边缘函数代抓三方 RSS，绕开 CORS，并用 Cache API 缓存 30 分钟。
 * 函数不可用时前端会退回构建期快照 /feeds.json。
 */
export const metadata: Metadata = {
  title: "友圈",
  description: "朋友们的最近更新：来自友链 RSS 的文章聚合，按时间倒序，点击标题跳转原文。",
  keywords: buildKeywords(["友圈", "友链", "RSS", "订阅", "博客"]),
  alternates: withRssCanonical("/circle/"),
};

export default function CirclePage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        友圈
      </h1>
      <p className="mb-8 text-base text-muted">朋友们的最近更新，按时间倒序。点击标题去原文。</p>
      <FeedReader />
    </main>
  );
}
