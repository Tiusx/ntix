import Link from "next/link";

interface TagPillProps {
  tag: string;
  /** sm：文章页头的元信息；md：栏目页的标签目录 */
  size?: "sm" | "md";
  /** 目录里展示文章数 */
  count?: number;
}

const SIZE = {
  sm: "px-2.5 py-0.5 text-[11px] text-muted",
  md: "px-3.5 py-1.5 text-sm text-ink",
} as const;

/**
 * 标签胶囊的唯一实现。
 *
 * 之前同一个「标签」在三个地方三种形状：文章页是 11px 灰胶囊、栏目页是
 * 14px ink 胶囊、碎碎念的标签页是一块 accent 底的小方块。这里统一外壳
 * （圆角、描边、悬停色），只让字号与文字色随场景变化。
 */
export function TagPill({ tag, size = "sm", count }: TagPillProps) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}/`}
      className={`inline-flex items-center gap-1 rounded-full border border-line transition-colors hover:border-accent hover:text-accent ${SIZE[size]}`}
    >
      {size === "md" ? <span className="text-muted">#</span> : null}
      <span>{tag}</span>
      {typeof count === "number" ? (
        <span className="ml-0.5 text-xs tabular-nums text-muted">{count}</span>
      ) : null}
    </Link>
  );
}
