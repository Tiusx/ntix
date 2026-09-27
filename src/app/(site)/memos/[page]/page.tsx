import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllMemos, getMemosPage, getMemosPageCount } from "@/lib/memos";
import { MemosFeed } from "@/components/memos-feed";
import { buildKeywords, withRssCanonical } from "@/lib/seo";

const MEMOS_PER_PAGE = 20;

export const dynamicParams = false;

export function generateStaticParams() {
  const count = getMemosPageCount(MEMOS_PER_PAGE);
  const last = Math.max(count, 2);
  return Array.from({ length: last - 1 }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const current = Number(page);
  const pageCount = getMemosPageCount(MEMOS_PER_PAGE);
  const outOfRange = !Number.isInteger(current) || current < 2 || current > pageCount;
  return {
    title: `说说 · 第 ${current} 页`,
    description: `Tiusx 说说第 ${current} / ${pageCount} 页：日常碎片与随手记录，收录读书笔记、行程见闻、生活片段与偶尔的技术想法。`,
    keywords: buildKeywords(["说说", "memos", "分页"]),
    // 越界页 canonical 回指第 1 页，避免被索引为重复内容
    alternates: withRssCanonical(outOfRange ? "/memos/" : `/memos/${current}/`),
  };
}

export default async function MemosPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const current = Number(page);
  const pageCount = getMemosPageCount(MEMOS_PER_PAGE);

  if (!Number.isInteger(current) || current < 2) {
    notFound();
  }

  const all = getAllMemos();
  // 越界（仅当说说不超过一页时的兜底占位参数可达）展示全部，
  // 理由同 tags/[tag]/[page]：静态导出下 notFound() 只会产出无内容的空壳页。
  const outOfRange = current > pageCount;
  const memos = outOfRange ? all : getMemosPage(current, MEMOS_PER_PAGE);

  return (
    <main className="content py-12">
      <header className="py-10">
        <h1 className="text-4xl font-extrabold text-ink">说说</h1>
        <div className="mt-3">
          我的日常碎片和随口说说。共 {all.length} 条。
        </div>
      </header>

      {outOfRange && (
        <p className="mb-8 border border-dashed border-line rounded-md px-4 py-3 text-sm text-muted">
          说说只有 {pageCount} 页，已显示全部内容。
        </p>
      )}

      <MemosFeed memos={memos} />

      {pageCount > 1 && !outOfRange && (
        <nav className="mt-14" aria-label="分页导航">
          <ul className="m-0 grid list-none grid-cols-[1fr_auto_1fr] items-center p-0">
            <li className="text-left">
              <Link
                href={current === 2 ? "/memos/" : `/memos/${current - 1}/`}
                className="hover:underline"
              >
                &lt; Prev
              </Link>
            </li>
            <li className="text-center text-sub">
              {current} of {pageCount}
            </li>
            <li className="text-right">
              {current < pageCount && (
                <Link href={`/memos/${current + 1}/`} className="hover:underline">
                  Next &gt;
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </main>
  );
}