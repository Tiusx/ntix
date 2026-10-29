import type { TocEntry } from "@/lib/headings";

/**
 * 文章内目录。
 *
 * 刻意做成纯服务端组件：条目在构建期就算好了，跳转是浏览器原生的锚点行为，
 * 不需要任何客户端 JS。也刻意没做「滚动高亮当前小节」——目录在正文上方，
 * 读一会儿就滚出视口了，高亮反而看不到；要做就得把它变成侧边粘性栏，
 * 那是另一套版式，不在这版里。
 */
export function Toc({ entries, className }: { entries: TocEntry[]; className?: string }) {
  if (entries.length === 0) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className={`mx-auto mt-8 max-w-[40rem] rounded-xl border border-line bg-card px-5 py-4 ${className ?? ""}`}
    >
      <p
        id="toc-heading"
        className="text-xs font-semibold tracking-wider text-muted uppercase"
      >
        本文目录
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={entry.depth === 3 ? "pl-4 text-[0.8rem]" : undefined}
          >
            <a
              href={`#${entry.id}`}
              className="text-sub transition-colors hover:text-accent hover:underline hover:decoration-accent/50 hover:underline-offset-4"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
