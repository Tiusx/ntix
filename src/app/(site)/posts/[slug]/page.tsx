import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostMeta } from "@/lib/posts";
import { BackToPostsLink } from "@/components/back-to-posts-link";
import LightboxImage from "@/components/lightbox-image";
import { WalineComments } from "@/components/waline-comments";

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
  const meta = getPostMeta(decodeURIComponent(slug));
  return { title: meta?.title ?? "未找到" };
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

  return (
    <main className="content py-12">
      <BackToPostsLink />

      <article className="mt-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-4 text-sm text-muted">
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
          <LightboxImage
            className="mt-8 w-full rounded-xl border border-line"
            src={meta.cover}
            alt=""
            wrapperClassName="block"
          />
        ) : null}

        <div className="prose mx-auto mt-10 max-w-[40rem]">
          <Post />
        </div>

        <WalineComments path={`/posts/${name}/`} />
      </article>
    </main>
  );
}