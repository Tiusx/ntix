import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostPageCount, getPostsPage } from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  const count = getPostPageCount(SITE_CONFIG.postsPerPage);
  const last = Math.max(count, 2);
  return Array.from({ length: last - 1 }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[page]">): Promise<Metadata> {
  const { page } = await params;
  const current = Number(page);
  return { title: `文章 · 第 ${current} 页` };
}

export default async function BlogPage({ params }: PageProps<"/blog/[page]">) {
  const { page } = await params;
  const current = Number(page);
  const pageCount = getPostPageCount(SITE_CONFIG.postsPerPage);

  if (!Number.isInteger(current) || current < 2 || current > pageCount) {
    notFound();
  }

  const posts = getPostsPage(current, SITE_CONFIG.postsPerPage);
  const all = getAllPosts();

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        Articles
      </h1>
      <p className="mb-10 text-base text-muted">{all.length} posts.</p>

      <PostList posts={posts} dense page={current} />

      <Pagination current={current} total={pageCount} />
    </main>
  );
}