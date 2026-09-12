import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, type Post } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Archive",
};

interface Item {
  slug: string;
  title: string;
  date: Date;
}

type ArchiveGroup = Map<number, Map<string, Item[]>>;

function groupPosts(posts: Post[]): ArchiveGroup {
  const grouped = new Map<number, Map<string, Item[]>>();
  for (const post of posts) {
    const d = new Date(post.meta.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (!grouped.has(year)) grouped.set(year, new Map());
    const byMonth = grouped.get(year)!;
    const key = `${month}月`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push({
      slug: post.slug,
      title: post.meta.title,
      date: d,
    });
  }
  return grouped;
}

export default function ArchivePage() {
  const posts = getAllPosts();
  const grouped = groupPosts(posts);
  const years = [...grouped.keys()].sort((a, b) => b - a);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        Archive
      </h1>
      <p className="mb-10 text-base text-muted">
        {posts.length} posts, sorted by date.
      </p>

      {years.length === 0 ? (
        <p className="text-muted">暂无文章。</p>
      ) : (
        <div className="relative ml-1.5 border-l border-line pl-8">
          {years.map((year) => {
            const byMonth = grouped.get(year)!;
            const yearCount = [...byMonth.values()].reduce(
              (n, arr) => n + arr.length,
              0,
            );
            return (
              <div key={year} className="relative mb-12">
                <span className="absolute -left-[37px] top-1.5 h-3 w-3 rounded-full bg-ink" />
                <h2 className="font-serif text-xl font-bold tracking-tight text-ink">
                  {year}
                  <span className="ml-3 font-sans text-sm font-normal text-muted">
                    {yearCount} posts
                  </span>
                </h2>
                <div className="mt-4">
                  {[...byMonth.entries()].map(([month, arr]) => (
                    <div key={month} className="mb-3">
                      <h3 className="mb-1.5 text-sm font-medium tracking-wide text-muted">
                        {month}
                      </h3>
                      <div>
                        {arr.map((item) => (
                          <Link
                            key={item.slug}
                            href={`/posts/${item.slug}/`}
                            className="group relative flex items-baseline gap-4 py-1.5"
                          >
                            <span className="absolute -left-[31px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-line transition-colors group-hover:bg-ink" />
                            <span className="min-w-0 truncate font-serif text-[17px] tracking-wide text-ink underline-offset-4 transition-colors group-hover:underline group-hover:decoration-accent">
                              {item.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}