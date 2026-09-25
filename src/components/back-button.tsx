"use client";

import { useRouter } from "next/navigation";

/**
 * 返回按钮。
 *
 * 不能无条件用 router.back()：从微信/搜索引擎直接打开文章、或在文章页刷新之后，
 * 浏览历史里并没有站内上一页，此时 back() 要么无反应，要么把用户带离站点。
 * 因此先判断是否存在「站内来源」，没有就跳到 fallback。
 */
export function BackButton({
  label = "← Back",
  fallback = "/blog/",
}: {
  label?: string;
  /** 无站内历史时的兜底目标 */
  fallback?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    const ref = document.referrer;
    let sameOrigin = false;
    if (ref) {
      try {
        sameOrigin = new URL(ref).origin === window.location.origin;
      } catch {
        sameOrigin = false;
      }
    }
    // history.length > 1 排除了「直接打开且只有一条历史」的情况
    if (sameOrigin && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="cursor-pointer text-sm text-muted transition-colors hover:text-accent"
    >
      {label}
    </button>
  );
}
