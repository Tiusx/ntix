import type { TocEntry } from "@/lib/posts";

/**
 * 文内目录。
 *
 * 刻意保持克制：原生 <details> 折叠（零 JS、零依赖），
 * 且只有标题数达到阈值时才渲染——短文里一个无意义的折叠块反而是噪音。
 */
export function Toc({ entries, minEntries }: { entries: TocEntry[]; minEntries: number }) {
  if (entries.length < minEntries) return null;

  return (
    <details className="toc not-prose my-8 rounded-lg border border-line/70 bg-card/40 px-4 py-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink">
        目录
        <span className="ml-2 font-normal normal-case tracking-normal text-sub">
          {entries.length} 节
        </span>
      </summary>
      <nav className="mt-3 border-t border-line/60 pt-3">
        <ol className="m-0 list-none space-y-1 p-0 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.depth === 3 ? "pl-4" : undefined}>
              <a
                href={`#${entry.id}`}
                className="block truncate text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
