import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllMemoTags, getMemosByTag } from "@/lib/memos";
import { MemosFeed } from "@/components/memos-feed";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = getAllMemoTags().map((tag) => ({ tag }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      getAllMemoTags().map((tag) => ({ tag: encodeURIComponent(tag) }))
    );
  }
  return raw;
}

export async function generateMetadata({
  params,
}: PageProps<"/memos/tag/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function MemosTagPage({
  params,
}: PageProps<"/memos/tag/[tag]">) {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const memos = getMemosByTag(name);
  if (memos.length === 0) notFound();

  return (
    <main className="content py-12">
      <nav className="flex items-center justify-between">
        <Link
          href="/memos/"
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          ← 说说
        </Link>
        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
          #{name} · {memos.length}
        </span>
      </nav>

      <header className="mt-8 border-b border-line pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          #{name}
        </h1>
        <p className="mt-2 text-sm text-muted">共 {memos.length} 条</p>
      </header>

      <section className="pt-6">
        <MemosFeed memos={memos} />
      </section>
    </main>
  );
}