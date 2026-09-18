import type { Metadata } from "next";
import { SearchBox } from "@/components/search-box";

export const metadata: Metadata = {
  title: "搜索",
  description: "搜索博客文章全文。",
};

export default function SearchPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        搜索
      </h1>
      <p className="mb-10 text-base text-muted">
        全文搜索博客文章，支持标题、摘要、标签与正文。
      </p>
      <SearchBox />
    </main>
  );
}