import type { Metadata } from "next";
import Link from "next/link";
import { getAllMemos, getMemosPage, getMemosPageCount } from "@/lib/memos";
import { MemosFeed } from "@/components/memos-feed";

const MEMOS_PER_PAGE = 20;

export const metadata: Metadata = {
  title: "说说",
  description: "我的日常碎片和随口说说。",
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
        <h1 className="text-4xl font-extrabold text-ink">说说</h1>
        <div className="mt-3">
          我的日常碎片和随口说说。共 {all.length} 条。
        </div>
      </header>

      <MemosFeed memos={memos} />

      {totalPages > 1 && <MemosPagination current={1} />}
    </main>
  );
}