/**
 * 评论区的配置与默认值。
 *
 * 单独成模块是为了让 `Comments` 能读到「哪套评论可用」而不把 Waline 的客户端
 * 拉进主包——这些常量一旦放进 waline-comments.tsx，静态引用就会连带把
 * @waline/client 和它的样式表打进首屏。
 *
 * `NEXT_PUBLIC_*` 会在构建期内联，所以这里的判断都是零运行时代价。
 */

export type CommentProvider = "giscus" | "waline";

/** 读者手动切换后记住选择 */
export const COMMENT_STORAGE_KEY = "ntix-comment-provider";

export const GISCUS_CONFIG = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO ?? "",
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? "",
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "",
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "",
};

/** 四项配置齐全才可用 */
export const GISCUS_ENABLED = Boolean(
  GISCUS_CONFIG.repo &&
    GISCUS_CONFIG.repoId &&
    GISCUS_CONFIG.category &&
    GISCUS_CONFIG.categoryId,
);

export const WALINE_SERVER_URL = process.env.NEXT_PUBLIC_WALINE_SERVER_URL ?? "";

/** 有服务地址才可用 */
export const WALINE_ENABLED = WALINE_SERVER_URL.length > 0;

/** 可用且顺序固定的提供方列表；只有一个时页面不显示切换按钮。 */
export const COMMENT_PROVIDERS: CommentProvider[] = [
  ...(GISCUS_ENABLED ? (["giscus"] as const) : []),
  ...(WALINE_ENABLED ? (["waline"] as const) : []),
];

/**
 * 默认展示哪一套：
 * - `NEXT_PUBLIC_COMMENT_PROVIDER` 指定了可用的一套 → 用它
 * - 指定的是 none，或指定的那套没配好 → 退到另一套可用的
 * - 两套都不可用 → null（整块不渲染）
 */
export function defaultCommentProvider(): CommentProvider | null {
  const wanted = (process.env.NEXT_PUBLIC_COMMENT_PROVIDER ?? "giscus").trim().toLowerCase();
  if (wanted === "none") return null;
  if (wanted === "waline") return WALINE_ENABLED ? "waline" : GISCUS_ENABLED ? "giscus" : null;
  if (wanted === "giscus") return GISCUS_ENABLED ? "giscus" : WALINE_ENABLED ? "waline" : null;
  return COMMENT_PROVIDERS[0] ?? null;
}
