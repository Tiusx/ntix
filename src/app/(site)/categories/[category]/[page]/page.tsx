import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_META_KEYS, getPostsByCategory, getPostsByCategoryPage, getPostsByCategoryPageCount } from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  const params: { category: string; page: string }[] = [];
  for (const category of CATEGORY_META_KEYS) {
    const pageCount = getPostsByCategoryPageCount(category, SITE_CONFIG.postsPerPage);
    for (let p = 2; p <= pageCount; p++) {
      params.push({ category, page: String(p) });
    }
  }
  // 兜底：若无分类需要分页，仍生成第一个分类的第 2 页占位，避免 static export 报错
  if (params.length === 0 && CATEGORY_META_KEYS.length > 0) {
    params.push({ category: CATEGORY_META_KEYS[0], page: "2" });
  }
  if (process.env.NODE_ENV === "development") {
    return params.concat(
      params.map(({ category, page }) => ({
        category: encodeURIComponent(category),
        page,
      }))
    );
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; page: string }>;
}): Promise<Metadata> {
  const { category, page } = await params;
  const name = decodeURIComponent(category);
  const current = Number(page);
  const baseUrl = SITE_CONFIG.siteUrl;
  const canonical = `${baseUrl}/categories/${encodeURIComponent(name)}/${current}/`;
  return {
    title: `${name} · 第 ${current} 页`,
    description: `${name} 分类第 ${current} 页`,
    alternates: { canonical },
    openGraph: {
      title: `${name} · 第 ${current} 页`,
      description: `${name} 分类第 ${current} 页`,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `${name} · 第 ${current} 页`,
      description: `${name} 分类第 ${current} 页`,
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
  params: Promise<{ category: string; page: string }>;
}) {
  const { category, page } = await params;
  const name = decodeURIComponent(category);
  const current = Number(page);
  const pageCount = getPostsByCategoryPageCount(name, SITE_CONFIG.postsPerPage);

  if (!Number.isInteger(current) || current < 2 || current > pageCount) {
    notFound();
  }

  const allPosts = getPostsByCategory(name);
  const posts = getPostsByCategoryPage(name, current, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        {name}
      </h1>
      <p className="mb-10 text-base text-muted">{allPosts.length} posts.</p>

      <section>
        <PostList posts={posts} dense page={current} />
      </section>

      <Pagination current={current} total={pageCount} />
    </main>
  );
}