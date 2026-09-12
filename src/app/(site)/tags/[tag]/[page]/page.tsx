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
  // 兜底：若无标签需要分页，仍生成第一个标签的第 2 页占位
  if (params.length === 0 && allTags.length > 0) {
    params.push({ tag: allTags[0].name, page: "2" });
  }
  if (process.env.NODE_ENV === "development") {
    return params.concat(
      params.map(({ tag, page }) => ({
        tag: encodeURIComponent(tag),
        page,
      }))
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
  const baseUrl = SITE_CONFIG.siteUrl;
  const canonical = `${baseUrl}/tags/${encodeURIComponent(name)}/${current}/`;
  return {
    title: `#${name} · 第 ${current} 页`,
    description: `标签 "${name}" 第 ${current} 页`,
    alternates: { canonical },
    openGraph: {
      title: `#${name} · 第 ${current} 页`,
      description: `标签 "${name}" 第 ${current} 页`,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: `#${name} · 第 ${current} 页`,
      description: `标签 "${name}" 第 ${current} 页`,
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
  const pageCount = getPostsByTagPageCount(name, SITE_CONFIG.postsPerPage);

  if (!Number.isInteger(current) || current < 2 || current > pageCount) {
    notFound();
  }

  const allPosts = getPostsByTag(name);
  const posts = getPostsByTagPage(name, current, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <BackButton />

      <header className="mt-6 border-b border-line pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          #{name}
        </h1>
        <p className="mt-2 text-sm text-muted">{allPosts.length} 篇</p>
      </header>

      <section className="pt-4">
        <PostList posts={posts} dense page={current} />
      </section>

      <Pagination current={current} total={pageCount} />
    </main>
  );
}