import { ogDefaultImage, withRssCanonical } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTags, getPostsByTag, getPostsByTagPage, getPostsByTagPageCount } from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";
import { BackButton } from "@/components/back-button";

export const dynamicParams = false;

export function generateStaticParams() {
  const allTags = getAllTags();
  const params: { tag: string; page: string }[] = [];
  for (const { name } of allTags) {
    const pageCount = getPostsByTagPageCount(name, SITE_CONFIG.postsPerPage);
    for (let p = 2; p <= pageCount; p++) {
      params.push({ tag: name, page: String(p) });
    }
  }
  // 兜底占位：Next.js 在 output:"export" 下要求动态路由的 generateStaticParams()
  // 不能返回空数组，否则构建直接失败。
  // 由于 dynamicParams=false，该占位参数就是本路由唯一可达的越界 URL。
  // 页面组件对越界情况渲染「全部文章 + canonical 指向第 1 页」而不是 notFound()——
  // 后者在静态导出下只会产出 Next 内置的 __next_error__ 空壳（无任何可见内容）。
  if (params.length === 0 && allTags.length > 0) {
    params.push({ tag: allTags[0].name, page: "2" });
  }
  if (process.env.NODE_ENV === "development") {
    return params.concat(
      params.map(({ tag, page }) => ({
        tag: encodeURIComponent(tag),
        page,
      })),
    );
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string; page: string }>;
}): Promise<Metadata> {
  const { tag, page } = await params;
  const name = decodeURIComponent(tag);
  const current = Number(page);
  const pageCount = getPostsByTagPageCount(name, SITE_CONFIG.postsPerPage);
  const outOfRange = !Number.isInteger(current) || current < 2 || current > pageCount;
  const baseUrl = SITE_CONFIG.siteUrl;
  // 越界页 canonical 回指第 1 页，避免被索引为重复内容
  const canonical = `${baseUrl}/tags/${encodeURIComponent(name)}/${outOfRange ? "" : `${current}/`}`;
  const description = outOfRange
    ? `#${name} 标签下的全部文章`
    : `标签 "${name}" 第 ${current} 页`;
  return {
    title: `#${name}`,
    description,
    alternates: withRssCanonical(canonical),
    openGraph: {
      title: `#${name} · 标签`,
      description,
        type: "website",
        url: canonical,
        images: ogDefaultImage(),
    },
    twitter: {
      card: "summary",
      title: `#${name} · 标签`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string; page: string }>;
}) {
  const { tag, page } = await params;
  const name = decodeURIComponent(tag);
  const current = Number(page);

  if (!Number.isInteger(current) || current < 2) {
    notFound();
  }

  const allPosts = getPostsByTag(name);
  if (allPosts.length === 0) notFound();

  const pageCount = getPostsByTagPageCount(name, SITE_CONFIG.postsPerPage);
  const outOfRange = current > pageCount;
  // 越界时展示全部文章（见 generateStaticParams 中的说明）
  const posts = outOfRange
    ? allPosts
    : getPostsByTagPage(name, current, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <BackButton />

      <header className="mt-6 border-b border-line pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          #{name}
        </h1>
        <p className="mt-2 text-sm text-muted">{allPosts.length} 篇</p>
      </header>

      {outOfRange && (
        <p className="mt-6 border border-dashed border-line rounded-md px-4 py-3 text-sm text-muted">
          该标签只有 {pageCount} 页，已显示全部文章。
        </p>
      )}

      <section className="pt-4">
        <PostList posts={posts} dense page={current} />
      </section>

      {pageCount > 1 && !outOfRange && (
        <Pagination
          current={current}
          total={pageCount}
          basePath={`/tags/${encodeURIComponent(name)}`}
        />
      )}
    </main>
  );
}
