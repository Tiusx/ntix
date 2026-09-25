import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CATEGORY_META_KEYS,
  getCategoryDescription,
  getPostsByCategory,
  getPostsByCategoryPage,
  getPostsByCategoryPageCount,
} from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  // 只为真正需要分页的分类生成第 2 页及之后的页面。
  // 不再生成「兜底占位页」——占位页会被下面的 notFound() 立刻 404，
  // 产出一个自相矛盾的静态文件。
  const params: { category: string; page: string }[] = [];
  for (const category of CATEGORY_META_KEYS) {
    const pageCount = getPostsByCategoryPageCount(category, SITE_CONFIG.postsPerPage);
    for (let p = 2; p <= pageCount; p++) {
      params.push({ category, page: String(p) });
    }
  }
  // 兜底占位页：Next.js 在 output:"export" 下要求动态路由的
  // generateStaticParams() 不能返回空数组，否则构建直接失败
  // （"returned an empty array from generateStaticParams()"）。
  // 该占位页在运行时会被下面的 notFound() 拦下，仅用于满足框架约束。
  if (params.length === 0 && CATEGORY_META_KEYS.length > 0) {
    params.push({ category: CATEGORY_META_KEYS[0], page: "2" });
  }
  if (process.env.NODE_ENV === "development") {
    return params.concat(
      params.map(({ category, page }) => ({
        category: encodeURIComponent(category),
        page,
      })),
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
  const categoryDescription = getCategoryDescription(name);
  const pageCount = getPostsByCategoryPageCount(name, SITE_CONFIG.postsPerPage);
  const outOfRange = !Number.isInteger(current) || current < 2 || current > pageCount;
  // 越界页 canonical 回指第 1 页，避免被索引为重复内容
  const canonical = `${baseUrl}/categories/${encodeURIComponent(name)}/${outOfRange ? "" : `${current}/`}`;
  const description = outOfRange
    ? categoryDescription || `${name} 分类下的全部文章`
    : `${name} 分类第 ${current} 页${categoryDescription ? ` · ${categoryDescription}` : ""}`;
  return {
    title: `${name} · 第 ${current} 页`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} · 第 ${current} 页`,
      description,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `${name} · 第 ${current} 页`,
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
  params: Promise<{ category: string; page: string }>;
}) {
  const { category, page } = await params;
  const name = decodeURIComponent(category);
  const current = Number(page);
  const pageCount = getPostsByCategoryPageCount(name, SITE_CONFIG.postsPerPage);

  if (!Number.isInteger(current) || current < 2) {
    notFound();
  }

  const allPosts = getPostsByCategory(name);
  // 越界（仅当没有任何分类需要分页时的兜底占位参数可达）展示全部文章，
  // 理由同 tags/[tag]/[page]：静态导出下 notFound() 只会产出空壳页。
  const outOfRange = current > pageCount;
  const posts = outOfRange
    ? allPosts
    : getPostsByCategoryPage(name, current, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        {name}
      </h1>
      <p className="mb-10 text-base text-muted">{allPosts.length} posts.</p>

      {outOfRange && (
        <p className="mb-8 border border-dashed border-line rounded-md px-4 py-3 text-sm text-muted">
          该分类只有 {pageCount} 页，已显示全部文章。
        </p>
      )}

      <section>
        <PostList posts={posts} dense page={current} />
      </section>

      {pageCount > 1 && !outOfRange && (
        <Pagination
          current={current}
          total={pageCount}
          basePath={`/categories/${encodeURIComponent(name)}`}
        />
      )}
    </main>
  );
}