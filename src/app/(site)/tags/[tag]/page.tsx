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
  const raw = getAllTags().map((entry) => ({ tag: entry.name }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      getAllTags().map((entry) => ({ tag: encodeURIComponent(entry.name) }))
    );
  }
  return raw;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const baseUrl = SITE_CONFIG.siteUrl;
  const canonical = `${baseUrl}/tags/${encodeURIComponent(name)}/`;
  return {
    title: `#${name}`,
    description: `标签 "${name}" 下的文章`,
    alternates: withRssCanonical(canonical),
    openGraph: {
      title: `#${name} · 标签`,
      description: `标签 "${name}" 下的文章`,
        type: "website",
        url: canonical,
        images: ogDefaultImage(),
    },
    twitter: {
      card: "summary",
      title: `#${name} · 标签`,
      description: `标签 "${name}" 下的文章`,
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
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const allPosts = getPostsByTag(name);
  if (allPosts.length === 0) notFound();

  const pageCount = getPostsByTagPageCount(name, SITE_CONFIG.postsPerPage);
  const posts = pageCount === 1 ? allPosts : getPostsByTagPage(name, 1, SITE_CONFIG.postsPerPage);

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
        <PostList posts={posts} dense page={1} />
      </section>

      {pageCount > 1 && (
        <Pagination current={1} total={pageCount} basePath={`/tags/${encodeURIComponent(name)}`} />
      )}
    </main>
  );
}