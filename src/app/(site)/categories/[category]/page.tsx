import type { Metadata } from "next";
import {
  CATEGORY_META_KEYS,
  getCategoryDescription,
  getPostsByCategory,
  getPostsByCategoryPage,
  getPostsByCategoryPageCount,
} from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { BackButton } from "@/components/back-button";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  // 分类是「规划中的 taxonomy」：即使当前 0 篇文章也始终生成页面，
  // 保证 /columns/ 里的入口不会指向 404。
  const raw = CATEGORY_META_KEYS.map((category) => ({ category }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      CATEGORY_META_KEYS.map((category) => ({
        category: encodeURIComponent(category),
      })),
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
  const description = getCategoryDescription(name) || `${name} 分类下的文章`;
  return {
    title: name,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} · 分类`,
      description,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `${name} · 分类`,
      description,
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
  const description = getCategoryDescription(name);
  const allPosts = getPostsByCategory(name);
  const pageCount = getPostsByCategoryPageCount(name, SITE_CONFIG.postsPerPage);
  const posts = pageCount === 1 ? allPosts : getPostsByCategoryPage(name, 1, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <BackButton />

      <header className="mb-10">
        <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
          {name}
        </h1>
        {description && <p className="mb-2 text-base text-muted">{description}</p>}
        <p className="text-sm text-muted">
          {allPosts.length} posts.
        </p>
      </header>

      {allPosts.length === 0 ? (
        <p className="border border-dashed border-line rounded-md px-4 py-8 text-center text-sm text-muted">
          「{name}」分类已规划，暂无文章。
        </p>
      ) : (
        <section>
          <PostList posts={posts} dense page={1} />
        </section>
      )}

      {pageCount > 1 && (
        <Pagination
          current={1}
          total={pageCount}
          basePath={`/categories/${encodeURIComponent(name)}`}
        />
      )}
    </main>
  );
}
