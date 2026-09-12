import type { Metadata } from "next";
import { CATEGORY_META_KEYS, getPostsByCategory } from "@/lib/posts";
import { PostList } from "@/components/post-list";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = CATEGORY_META_KEYS.map((category) => ({ category }));
  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      CATEGORY_META_KEYS.map((category) => ({
        category: encodeURIComponent(category),
      }))
    );
  }
  return raw;
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[category]">): Promise<Metadata> {
  const { category } = await params;
  return { title: decodeURIComponent(category) };
}

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[category]">) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const posts = getPostsByCategory(name);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        {name}
      </h1>
      <p className="mb-10 text-base text-muted">{posts.length} posts.</p>

      <section>
        <PostList posts={posts} dense />
      </section>
    </main>
  );
}