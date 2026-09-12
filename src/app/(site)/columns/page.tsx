import type { Metadata } from "next";
import Link from "next/link";
import {
  CATEGORY_META,
  CATEGORY_META_KEYS,
  getAllTags,
  getPostsCountByCategory,
} from "@/lib/posts";

export const metadata: Metadata = {
  title: "Columns",
};

export default function ColumnsPage() {
  const categories = CATEGORY_META_KEYS.map((name) => ({
    name,
    count: getPostsCountByCategory(name),
  }));
  const tags = getAllTags();

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        Columns
      </h1>
      <p className="mb-10 text-base text-muted">
        {categories.length} categories · {tags.length} tags.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-bold tracking-tight text-ink">
          Categories
        </h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {categories.map((category) => (
            <li key={category.name}>
              <Link
                href={`/categories/${encodeURIComponent(category.name)}/`}
                className="group block rounded-md px-3 py-2.5 transition-colors hover:bg-card"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-[17px] font-bold tracking-wide text-ink transition-colors group-hover:text-accent">
                    {category.name}
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    {category.count}
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                  {CATEGORY_META[category.name]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-bold tracking-tight text-ink">
          Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              href={`/tags/${encodeURIComponent(tag.name)}/`}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-card hover:text-accent"
            >
              <span className="text-muted">#</span>
              {tag.name}
              <span className="ml-1.5 text-xs tabular-nums text-muted">
                {tag.count}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}