import Link from "next/link";

function pageHref(page: number): string {
  return page === 1 ? "/blog/" : `/blog/${page}/`;
}

export function Pagination({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <nav className="mt-10 flex items-center justify-between border-t border-line pt-6 font-serif text-sm">
      {current > 1 ? (
        <Link
          href={pageHref(current - 1)}
          className="text-ink underline-offset-4 hover:underline hover:decoration-accent"
        >
          ← 上一页
        </Link>
      ) : (
        <span className="text-muted">← 上一页</span>
      )}

      <span className="text-muted">第 {current} / {total} 页</span>

      {current < total ? (
        <Link
          href={pageHref(current + 1)}
          className="text-ink underline-offset-4 hover:underline hover:decoration-accent"
        >
          下一页 →
        </Link>
      ) : (
        <span className="text-muted">下一页 →</span>
      )}
    </nav>
  );
}