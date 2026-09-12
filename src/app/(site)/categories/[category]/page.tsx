import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_META_KEYS, getPostsByCategory, getPostsByCategoryPage, getPostsByCategoryPageCount } from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = CATEGORY_META_KEYS.map((category) => ({ category }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      CATEGORY_META_KEYS.map((category) => ({
        category: encodeURIComponent(category),
      }))
    );
  }
  return raw;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const baseUrl = SITE_CONFIG.siteUrl;
  const canonical = `${baseUrl}/categories/${encodeURIComponent(name)}/`;
  return {
    title: name,
    description: `${name} 分类下的文章`,
    alternates: { canonical },
    openGraph: {
      title: `${name} · 分类`,
      description: `${name} 分类下的文章`,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `${name} · 分类`,
      description: `${name} 分类下的文章`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const allPosts = getPostsByCategory(name);
  const pageCount = getPostsByCategoryPageCount(name, SITE_CONFIG.postsPerPage);
  const posts = pageCount === 1 ? allPosts : getPostsByCategoryPage(name, 1, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        {name}
      </h1>
      <p className="mb-10 text-base text-muted">{allPosts.length} posts.</p>

      <section>
        <PostList posts={posts} dense page={1} />
      </section>

      {pageCount > 1 && <Pagination current={1} total={pageCount} />}
    </main>
  );
}