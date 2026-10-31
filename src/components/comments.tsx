"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { GiscusComments } from "./giscus-comments";
import {
  COMMENT_PROVIDERS,
  COMMENT_STORAGE_KEY,
  defaultCommentProvider,
  GISCUS_ENABLED,
  WALINE_ENABLED,
  type CommentProvider,
} from "@/lib/comments";

/**
 * 评论区入口。
 *
 * 页面上给一个切换按钮，读者自己选 Giscus 还是 Waline；选择写进 localStorage，
 * 下次进站沿用。默认值是构建时的 `NEXT_PUBLIC_COMMENT_PROVIDER`，没配就用
 * 第一套可用的。
 *
 * Waline 走动态引入：它的客户端 + 样式表比 Giscus 大一个量级，选 Giscus 的
 * 读者不该为它付任何字节（产物里它是独立的 199KB JS / 22KB CSS 块）。
 *
 * 选择用 useSyncExternalStore 读：服务端快照返回 null，首帧只渲染占位，等
 * 客户端读到 localStorage 再挂载真正的评论组件——否则选过 Waline 的人会先
 * 看到 Giscus 被拉起来又被替换掉。顺带还能响应其它标签页里的切换。
 */

const WalineComments = dynamic(
  () => import("./waline-comments").then((mod) => mod.WalineComments),
  { ssr: false, loading: () => null },
);

const INITIAL = defaultCommentProvider();
const SWITCHABLE = COMMENT_PROVIDERS.length > 1;
const CHANGE_EVENT = "ntix-comment-provider";

const LABEL: Record<CommentProvider, string> = {
  giscus: "Giscus",
  waline: "Waline",
};

function readProvider(): CommentProvider | null {
  try {
    const saved = window.localStorage.getItem(COMMENT_STORAGE_KEY);
    if (saved === "giscus" && GISCUS_ENABLED) return "giscus";
    if (saved === "waline" && WALINE_ENABLED) return "waline";
  } catch {
    // 隐私模式下 localStorage 不可读，用默认值
  }
  return INITIAL;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

interface CommentsProps {
  /** 评论区小标题。文章页默认「评论」，留言板这类场景可以换掉。 */
  title?: string;
}

export function Comments({ title = "评论" }: CommentsProps) {
  const provider = useSyncExternalStore(subscribe, readProvider, () => null);

  if (!INITIAL) return null;

  const active = provider ?? INITIAL;

  const choose = (next: CommentProvider) => {
    try {
      window.localStorage.setItem(COMMENT_STORAGE_KEY, next);
    } catch {
      // 存不上不影响本次切换
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <section className="mt-12 border-t border-line pt-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-[11px] tracking-[0.14em] text-muted">{title}</h2>
        {SWITCHABLE ? (
          <div
            role="group"
            aria-label="切换评论系统"
            className="flex items-center gap-0.5 rounded-full border border-line p-0.5"
          >
            {COMMENT_PROVIDERS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                aria-pressed={active === id}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[11px] leading-none transition-colors ${
                  active === id ? "bg-ink/10 text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {LABEL[id]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {provider === null ? (
          // 客户端还没接管：留一点高度，避免评论区出现时把页面往下顶
          <div className="h-16" aria-hidden="true" />
        ) : provider === "waline" ? (
          <WalineComments />
        ) : (
          <GiscusComments />
        )}
      </div>
    </section>
  );
}
