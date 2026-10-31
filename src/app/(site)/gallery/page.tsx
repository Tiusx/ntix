import type { Metadata } from "next";
import Link from "next/link";
import { buildKeywords, withRssCanonical } from "@/lib/seo";

/**
 * 相册。
 *
 * 目前没有图片数据源（文章配图是图床直链，不成组），先做占位页，
 * 保证「发现」分类下的入口不是死链；以后接 R2 的相册目录即可替换空状态。
 */
export const metadata: Metadata = {
  title: "相册",
  description: "Tiusx 的相册：照片还在整理，先留个位置。",
  keywords: buildKeywords(["相册", "照片", "图集"]),
  alternates: withRssCanonical("/gallery/"),
};

export default function GalleryPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        相册
      </h1>
      <p className="mb-10 text-base text-muted">照片还没整理，先留个位置。</p>

      <div className="rounded-md border border-dashed border-line px-6 py-16 text-center">
        <p className="font-serif text-lg font-bold tracking-tight text-ink">还没有照片</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          等攒够一组再放上来。日常碎片可以先看碎碎念。
        </p>
        <Link
          href="/memos/"
          className="mt-6 inline-block text-sm text-ink underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          去碎碎念 →
        </Link>
      </div>
    </main>
  );
}
