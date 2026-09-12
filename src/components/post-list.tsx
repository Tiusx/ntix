import Link from "next/link";
import type { Post } from "@/lib/posts";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function postHref(slug: string, page?: number): string {
  const base = `/posts/${slug}/`;
  return page && page > 1 ? `${base}?from=${page}` : base;
}

export function PostList({
  posts,
  dense = false,
  compact = false,
  page,
}: {
  posts: Post[];
  dense?: boolean;
  compact?: boolean;
  page?: number;
}) {
  if (posts.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">暂无文章。</p>;
  }

  if (dense) {
    return (
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={postHref(post.slug, page)}
              className="group flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <time
                dateTime={post.meta.date}
                className="font-mono text-sm tabular-nums text-muted sm:w-24 sm:shrink-0"
              >
                {formatDateShort(post.meta.date)}
              </time>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-serif text-[17px] leading-snug tracking-wide">
                <span className="transition-colors group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                  {post.meta.title}
                </span>
                {post.meta.category ? (
                  <span className="font-sans text-xs text-muted">
                    · {post.meta.category}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (compact) {
    return (
      <ul>
        {posts.map((post) => (
          <li
            key={post.slug}
            className="flex items-baseline justify-between gap-4 py-1.5"
          >
            <Link
              href={postHref(post.slug, page)}
              className="min-w-0 truncate text-[0.95rem] font-medium text-ink transition-colors hover:text-accent"
            >
              {post.meta.title}
            </Link>
            <time
              dateTime={post.meta.date}
              className="shrink-0 text-sm tabular-nums text-muted"
            >
              {post.meta.date}
            </time>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {posts.map((post) => (
        <li key={post.slug} className="py-6">
          <Link href={`/posts/${post.slug}/`} className="group block">
            <p className="text-sm text-muted">
              <time dateTime={post.meta.date}>{post.meta.date}</time>
              {post.meta.category ? (
                <span> · {post.meta.category}</span>
              ) : null}
            </p>
            <h3 className="mt-1 text-lg font-medium tracking-tight text-ink transition-colors group-hover:text-accent">
              {post.meta.title}
            </h3>
            {post.meta.summary ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                {post.meta.summary}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}