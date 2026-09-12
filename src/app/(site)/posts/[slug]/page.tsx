import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostMeta } from "@/lib/posts";
import { BackToPostsLink } from "@/components/back-to-posts-link";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getPostMeta(slug);
  return { title: meta?.title ?? "未找到" };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const meta = getPostMeta(slug);
  if (!meta) notFound();

  const { default: Post } = await import(`@content/posts/${slug}.md`);

  return (
    <main className="content py-12">
      <BackToPostsLink />

      <article className="mt-6">
        <header className="border-b border-line pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={meta.date}>{meta.date}</time>
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
          <img className="mt-8 rounded-xl border border-line" src={meta.cover} alt="" />
        ) : null}

        <div className="prose mx-auto mt-8">
          <Post />
        </div>
      </article>
    </main>
  );
}