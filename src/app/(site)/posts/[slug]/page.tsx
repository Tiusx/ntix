import { withRssCanonical, postKeywords, descriptionOrSite } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBody, getPostMeta, getPostStats } from "@/lib/posts";
import { formatDate } from "@/lib/date";
import LightboxImage from "@/components/lightbox-image";
import { Comments } from "@/components/comments";
import { Toc } from "@/components/toc";
import { TocSidebar } from "@/components/toc-sidebar";
import { Icon } from "@/components/icon";
import { TagPill } from "@/components/tag-pill";
import { extractHeadings, TOC_MIN_ENTRIES } from "@/lib/headings";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = getAllPosts().map((post) => ({ slug: post.slug }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      raw.map(({ slug }) => ({ slug: encodeURIComponent(slug) }))
    );
  }
  return raw;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const meta = getPostMeta(name);
  if (!meta) return { title: "未找到" };

  const url = `${SITE_CONFIG.siteUrl}/posts/${encodeURIComponent(meta.slug)}/`;
  const description = descriptionOrSite(meta.summary) ;

  return {
    title: meta.title,
    description,
    keywords: postKeywords(meta.category, meta.tags),
    alternates: withRssCanonical(url),
    openGraph: {
      type: "article",
      title: meta.title,
      description,
      url,
      siteName: SITE_CONFIG.title,
      publishedTime: meta.date,
      modifiedTime: meta.date,
      authors: [SITE_CONFIG.title],
      tags: meta.tags,
      // 刻意不声明 images：写了会盖掉同段 opengraph-image.tsx 生成的专属卡片，
      // 让每篇文章都退回默认图。og:image（含 image:alt）由该文件约定产出。
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description,
    },
    other: {
      "article:published_time": meta.date,
      "article:modified_time": meta.date,
      "article:author": SITE_CONFIG.title,
      "article:section": meta.category || "",
      "article:tag": meta.tags.join(","),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const meta = getPostMeta(name);
  if (!meta) notFound();

  const { default: Post } = await import(`@content/posts/${name}.md`);
  const url = `${SITE_CONFIG.siteUrl}/posts/${encodeURIComponent(meta.slug)}/`;
  const image = meta.cover || `${SITE_CONFIG.siteUrl}/avatar.jpg`;

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((post) => post.slug === meta.slug);

  // allPosts 已按日期倒序：index 0 是最新一篇
  const newer = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const older = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const stats = getPostStats(meta.slug);
  // 目录只在正文够长时出现：短笔记套个大目录反而碍事。
  const headings = extractHeadings(getPostBody(meta.slug));
  const toc = headings.length >= TOC_MIN_ENTRIES ? headings : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.summary || meta.title,
    image,
    datePublished: meta.date,
    dateModified: meta.date,
    author: {
      "@type": "Person",
      name: SITE_CONFIG.title,
      url: SITE_CONFIG.siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.title,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.siteUrl}/avatar.jpg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <main className="content article-page py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <header>
          <h1 className="text-[1.6rem] leading-[1.32] font-semibold tracking-[-0.012em] text-ink [overflow-wrap:anywhere] sm:text-[1.9rem]">
            {meta.title}
          </h1>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.74rem] tracking-wide text-muted">
            <time dateTime={meta.date} className="tabular-nums">
              {formatDate(meta.date)}
            </time>
            {meta.category ? (
              <>
                <span className="text-line">·</span>
                <Link
                  href={`/categories/${encodeURIComponent(meta.category)}/`}
                  className="text-accent transition-colors hover:underline hover:underline-offset-2"
                >
                  {meta.category}
                </Link>
              </>
            ) : null}
            <span className="text-line">·</span>
            <span className="tabular-nums text-sub">
              约 {stats.minutes} 分钟 · {stats.count.toLocaleString("zh-CN")} 字
            </span>
          </div>
          {meta.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {meta.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          ) : null}
        </header>

        {meta.cover ? (
          <LightboxImage
            className="mt-8 w-full rounded-xl border border-line"
            src={meta.cover}
            alt={meta.title}
            wrapperClassName="block"
          />
        ) : null}

        {/* 目录放在 prose 之外：Tailwind typography 会给 ol/p/a 套上正文样式
            （编号、段间距），放进去反而要一层层覆盖。
            小屏用顶部卡片，宽屏换成右侧粘性版（见 TocSidebar）。 */}
        <Toc entries={toc} className="xl:hidden" />
        <TocSidebar entries={toc} />

        <div className="prose mx-auto mt-10 max-w-[40rem]">
          <Post />
        </div>

        {/* 上下篇：两条并排的轻量导航，靠箭头和字重区分方向。
            不套 max-w-[40rem]：与页头标题对齐到容器宽度，而不是跟正文列。 */}
        {(newer || older) && (
          <nav className="mt-14 grid gap-x-8 gap-y-5 border-t border-line pt-7 sm:grid-cols-2">
            {older ? (
              <Link href={`/posts/${older.slug}/`} className="group min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted">
                  <Icon name="arrow-left" size={11} /> 上一篇
                </span>
                <span className="mt-1.5 block line-clamp-2 text-sm leading-snug text-ink transition-colors group-hover:text-accent">
                  {older.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link href={`/posts/${newer.slug}/`} className="group min-w-0 sm:text-right">
                <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted sm:justify-end">
                  下一篇 <Icon name="arrow-right" size={11} />
                </span>
                <span className="mt-1.5 block line-clamp-2 text-sm leading-snug text-ink transition-colors group-hover:text-accent">
                  {newer.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <Comments />
      </article>
    </main>
  );
}