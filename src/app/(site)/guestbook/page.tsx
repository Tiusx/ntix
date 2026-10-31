import type { Metadata } from "next";
import { Comments } from "@/components/comments";
import { buildKeywords, withRssCanonical } from "@/lib/seo";

/**
 * 留言板。
 *
 * 整页内容就是评论区：Giscus 按 pathname 建 discussion、Waline 按页面路径存
 * comment，所以 /guestbook/ 天然是独立的一帖，不会和文章评论混在一起。
 * 没有评论系统可用时 Comments 会整块不渲染，这里也不做额外兜底。
 */
export const metadata: Metadata = {
  title: "留言板",
  description:
    "Tiusx 的留言板：文章纠错、技术问题、想说的话都可以留在这里，不用挑话题。看到就会回。",
  keywords: buildKeywords(["留言板", "留言", "guestbook", "反馈"]),
  alternates: withRssCanonical("/guestbook/"),
};

export default function GuestbookPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        Guestbook
      </h1>
      <p className="text-base text-muted">不用挑话题，想说什么都行。</p>
      <p className="mt-1.5 text-sm text-sub">
        文章纠错、技术问题、随便聊聊都欢迎，看到就会回。
      </p>

      <Comments title="留言" />
    </main>
  );
}
