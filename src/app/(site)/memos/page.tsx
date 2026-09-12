import type { Metadata } from "next";
import { MemosFeed } from "@/components/memos-feed";

export const metadata: Metadata = {
  title: "说说",
  description: "短小的日常记录与碎碎念。",
};

export default function MemosPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        说说
      </h1>
      <p className="mb-10 text-base text-muted">来自 Memos 的短记录。</p>
      <MemosFeed />
    </main>
  );
}