import Link from "next/link";

/**
 * 分区列表的分页导航。
 * basePath 为该分区的路径前缀（如 "/blog"、"/categories/开发"），
 * 必须由调用方传入——组件无法自行推断，猜错会把用户带到别的分区。
 */
function pageHref(basePath: string, page: number): string {
  return page === 1 ? `${basePath}/` : `${basePath}/${page}/`;
}

export function Pagination({
  current,
  total,
  basePath,
}: {
  current: number;
  total: number;
  /** 不含结尾斜杠的分区路径前缀，如 "/blog"、"/categories/开发" */
  basePath: string;
}) {
  const isFirst = current <= 1;
  const isLast = current >= total;

  return (
    <nav className="mt-10 flex items-center justify-between border-t border-line pt-6 font-serif text-sm">
      {isFirst ? (
        <span className="text-muted">← 上一页</span>
      ) : (
        <Link
          href={pageHref(basePath, current - 1)}
          rel="prev"
          className="text-ink underline-offset-4 hover:underline hover:decoration-accent"
        >
          ← 上一页
        </Link>
      )}

      <span className="text-muted">
        第 {current} / {total} 页
      </span>

      {isLast ? (
        <span className="text-muted">下一页 →</span>
      ) : (
        <Link
          href={pageHref(basePath, current + 1)}
          rel="next"
          className="text-ink underline-offset-4 hover:underline hover:decoration-accent"
        >
          下一页 →
        </Link>
      )}
    </nav>
  );
}
