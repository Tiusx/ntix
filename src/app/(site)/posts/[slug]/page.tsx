import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostMeta } from "@/lib/posts";
import { BackToPostsLink } from "@/components/back-to-posts-link";
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
  const image = meta.cover || `${SITE_CONFIG.siteUrl}/avatar.jpg`;

  return {
    title: meta.title,
    description,
    alternates: { canonical: url },
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
      images: [{ url: image, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description,
      images: [image],
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
      <BackToPostsLink />

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

        <div className="prose mx-auto mt-10 max-w-[40rem]">
          <Post />
        </div>

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