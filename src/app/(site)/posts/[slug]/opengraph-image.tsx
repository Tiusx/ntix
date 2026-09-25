import { getAllPosts, getPostMeta } from "@/lib/posts";
import { OG_SIZE, postCard } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
/** 静态导出要求 alt 为编译期常量，无法按文章取标题；中文标题由 og:title 承载。 */
export const alt = "Tiusx";
export const dynamic = "force-static";

/** output:"export" 下动态路由必须提供 generateStaticParams。 */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const meta = getPostMeta(slug);
  const all = getAllPosts();
  const index = all.findIndex((p) => p.slug === slug);
  return postCard({
    // allPosts 已按日期倒序，故总数 - index 即「倒数第几篇」
    serial: index >= 0 ? all.length - index : null,
    date: meta?.date ? meta.date.slice(0, 10).replace(/-/g, ".") : "",
  });
}
