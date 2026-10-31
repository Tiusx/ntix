import type { Metadata } from "next";
import Link from "next/link";
import { getAllMemos, getMemosPage, getMemosPageCount } from "@/lib/memos";
import { MemosFeed } from "@/components/memos-feed";
import { Icon } from "@/components/icon";
import { buildKeywords } from "@/lib/seo";

const MEMOS_PER_PAGE = 20;

export const metadata: Metadata = {
  title: "碎碎念",
  description:
    "Tiusx 的日常碎片与随手记录：读书、行程、踩坑与生活片段。较正式的技术内容会整理成文章发布，这里保留更随手、更短篇的部分。",
  keywords: buildKeywords(["碎碎念", "memos", "日常", "生活记录"]),
  // 碎碎念有自己的 feed，这里的自动发现要指向它，而不是只发文章的 /rss.xml
  alternates: {
    canonical: "/memos/",
    types: {
      "application/rss+xml": [{ url: "/memos/rss.xml", title: "Tiusx · 碎碎念 RSS" }],
    },
  },
};

function MemosPagination({ current }: { current: number }) {
  const totalPages = getMemosPageCount(MEMOS_PER_PAGE);
  const hrefFor = (page: number) => (page === 1 ? "/memos/" : `/memos/${page}/`);

  return (
    <nav className="mt-14" aria-label="分页导航">
      <ul className="m-0 grid list-none grid-cols-[1fr_auto_1fr] items-center p-0">
        <li className="text-left">
          {current > 1 && (
            <Link href={hrefFor(current - 1)} className="hover:underline">
              &lt; Prev
            </Link>
          )}
        </li>
        <li className="text-center text-sub">
          {current} of {totalPages}
        </li>
        <li className="text-right">
          {current < totalPages && (
            <Link href={hrefFor(current + 1)} className="hover:underline">
              Next &gt;
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default function MemosPage() {
  const all = getAllMemos();
  const memos = getMemosPage(1, MEMOS_PER_PAGE);
  const totalPages = getMemosPageCount(MEMOS_PER_PAGE);

  return (
    <main className="content py-12">
      <header className="py-10">
        <h1 className="text-4xl font-extrabold text-ink">碎碎念</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>日常碎片与随手记。共 {all.length} 条。</span>
          <a
            href="/memos/rss.xml"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
            aria-label="订阅碎碎念的 RSS"
          >
            <Icon name="rss" size={13} />
            RSS 订阅
          </a>
        </div>
      </header>

      <MemosFeed memos={memos} />

      {totalPages > 1 && <MemosPagination current={1} />}
    </main>
  );
}