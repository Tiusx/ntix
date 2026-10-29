import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDateDots } from "@/lib/date";

/**
 * 列表里的文章链接。
 *
 * 曾经给密集列表拼过 `?from=<page>` 想让详情页知道来源，但详情页从头到尾
 * 没读过这个参数（BackButton 用的是 document.referrer），等于给每个分页
 * 凭空造出一批带查询串的重复 URL，对收录与统计都是噪音。已移除。
 */
function postHref(slug: string): string {
  return `/posts/${slug}/`;
}

export function PostList({
  posts,
  dense = false,
}: {
  posts: Post[];
  dense?: boolean;
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
              href={postHref(post.slug)}
              className="group flex flex-col gap-1.5 py-3.5"
            >
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                <time
                  dateTime={post.meta.date}
                  className="font-mono text-sm tabular-nums text-muted"
                >
                  {formatDateDots(post.meta.date)}
                </time>
                {post.meta.category ? (
                  <span className="text-sm leading-none text-muted">
                    in{" "}
                    <span className="text-ink">{post.meta.category}</span>
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-serif text-base font-semibold leading-snug tracking-wide">
                <span className="transition-colors group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                  {post.meta.title}
                </span>
              </span>
            </Link>
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