import { withRssCanonical } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getPostMeta,
  getPostStats,
  getPostToc,
  TOC_MIN_ENTRIES,
} from "@/lib/posts";
import { BackButton } from "@/components/back-button";
import { Toc } from "@/components/toc";
import LightboxImage from "@/components/lightbox-image";
import { GiscusComments } from "@/components/giscus-comments";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

// 文章日期统一按中国时区显示（构建时由 Intl 固定 Asia/Shanghai，无客户端差异）
function formatChinaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatShortDate(iso: string): string {
  const parts = formatChinaDate(iso).split("-");
  if (parts.length !== 3) return iso;
  const [, m, d] = parts;
  return `${+m}.${+d}`;
}

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
  const description = meta.summary || meta.title;

  return {
    title: meta.title,
    description,
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
  const related = allPosts.slice(
    Math.max(0, currentIndex - 2),
    currentIndex + 3
  ).filter((post) => post.slug !== meta.slug);

  // allPosts 已按日期倒序：index 0 是最新一篇
  const newer = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const older = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const stats = getPostStats(meta.slug);
  const toc = getPostToc(meta.slug);

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
    <main className="content py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton label="← 返回列表" />

      <article className="mt-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {meta.title}
          </h1>
          <p className="mt-4 text-sm text-muted">
            <time dateTime={meta.date}>{formatChinaDate(meta.date)}</time>
            {meta.category ? (
              <span>
                {" "}
                ·{" "}
                <Link
                  href={`/categories/${encodeURIComponent(meta.category)}/`}
                  className="text-accent transition-colors hover:underline"
                >
                  {meta.category}
                </Link>
              </span>
            ) : null}
            <span className="text-sub">
              {" "}
              · 约 {stats.minutes} 分钟 · {stats.count.toLocaleString("zh-CN")} 字
            </span>
          </p>
          {meta.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}/`}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {tag}
                </Link>
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

        <div className="mx-auto max-w-[40rem]">
          <Toc entries={toc} minEntries={TOC_MIN_ENTRIES} />
        </div>

        <div className="prose mx-auto mt-10 max-w-[40rem]">
          <Post />
        </div>

        {(newer || older) && (
          <nav className="mx-auto mt-12 grid max-w-[40rem] gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {older ? (
              <Link
                href={`/posts/${older.slug}/`}
                className="group flex min-w-0 flex-col rounded-lg border border-line px-4 py-3 transition-colors hover:border-accent hover:bg-card"
              >
                <span className="text-xs text-sub">← 上一篇</span>
                <span className="mt-1 truncate text-sm text-ink transition-colors group-hover:text-accent">
                  {older.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={`/posts/${newer.slug}/`}
                className="group flex min-w-0 flex-col rounded-lg border border-line px-4 py-3 text-right transition-colors hover:border-accent hover:bg-card"
              >
                <span className="text-xs text-sub">下一篇 →</span>
                <span className="mt-1 truncate text-sm text-ink transition-colors group-hover:text-accent">
                  {newer.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <div className="mx-auto mt-12 max-w-[40rem]">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            其他文章
          </h2>
          <ul className="divide-y divide-dashed divide-line/60">
            {related.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/posts/${post.slug}/`}
                  className="group -mx-2 flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-card active:bg-card sm:gap-3 sm:py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-muted transition-colors group-hover:text-accent active:text-accent">
                    {post.meta.title}
                  </span>
                  <time
                    dateTime={post.meta.date}
                    className="shrink-0 font-mono text-[0.7rem] tabular-nums text-sub sm:text-xs"
                  >
                    {formatShortDate(post.meta.date)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <GiscusComments />
      </article>
    </main>
  );
}