import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { PostList } from "@/components/post-list";
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
}: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const posts = getPostsByTag(name);
  if (posts.length === 0) notFound();

  return (
    <main className="content pt-12 pb-12">
      <BackButton />

      <header className="mt-6 border-b border-line pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          #{name}
        </h1>
        <p className="mt-2 text-sm text-muted">{posts.length} 篇</p>
      </header>

      <section className="pt-4">
        <PostList posts={posts} dense />
      </section>
    </main>
  );
}