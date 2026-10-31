"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ICON_BUTTON_CLASS } from "@/components/icon-button";
import { highlight, searchEntries, snippet } from "@/lib/search";
import type { SearchEntry } from "@/lib/search-index";

/**
 * 全站搜索浮层。
 *
 * 之前搜索是独立页面：用户在文章里按 / 或 ⌘K 没有任何反应（监听只挂在
 * /search/ 的组件里），想搜一次就得离开当前文章。现在入口搬到 header，
 * 浮层在任意页面可用，索引只在第一次打开时拉一次。
 *
 * 索引约 50KB（29 篇），一次性 fetch 比每次查询打接口更划算；
 * 若以后文章数上到几百篇，这里应改成按需加载分片。
 */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  // 索引只拉一次：用 ref 去重，避免在 effect 里同步 setState（会触发级联渲染）
  const loadingRef = useRef(false);

  // 全局快捷键：⌘K / Ctrl+K 总是可用；/ 在非输入状态下可用
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      const shortcut =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey);
      if (shortcut) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 打开时：聚焦输入框、锁滚动、首次拉索引
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (status === "idle" && !loadingRef.current) {
      loadingRef.current = true;
      fetch("/search-index.json")
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then((data: SearchEntry[]) => {
          setEntries(data);
          setStatus("ready");
        })
        .catch(() => setStatus("error"))
        .finally(() => {
          loadingRef.current = false;
        });
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, status]);

  const results = useMemo(
    () => (query.trim() ? searchEntries(entries, query, 8) : []),
    [entries, query],
  );
  const q = query.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={ICON_BUTTON_CLASS}
        aria-label="搜索文章（按 / 或 ⌘K）"
        title="搜索（/ 或 ⌘K）"
      >
        <Icon name="search" size={15} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="搜索文章"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-[36rem] overflow-hidden rounded-xl border border-line bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Icon name="search" size={15} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、标签、正文…"
                className="w-full bg-transparent py-3.5 text-sm text-ink placeholder-muted outline-none"
              />
              <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {status === "error" && (
                <p className="px-3 py-4 text-sm text-muted">
                  搜索索引未生成。本地开发请用 <code className="font-mono text-xs">pnpm dev</code>
                  （predev 会生成 public/search-index.json）。
                </p>
              )}

              {status === "ready" && !q && (
                <p className="px-3 py-4 text-sm text-muted">
                  输入关键词，共 {entries.length} 篇文章可搜。
                </p>
              )}

              {q && results.length === 0 && status === "ready" && (
                <p className="px-3 py-4 text-sm text-muted">没有找到匹配「{q}」的文章。</p>
              )}

              {results.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/posts/${entry.slug}/`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-page"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-medium text-ink"
                      dangerouslySetInnerHTML={{ __html: highlight(entry.title, q) }}
                    />
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                      {entry.date}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlight(snippet(entry.summary || entry.content, q, 40), q),
                      }}
                    />
                  </p>
                </Link>
              ))}

              {q && results.length > 0 && (
                <p className="px-3 pt-1 pb-2 text-[11px] text-muted">
                  {results.length} 条结果 · ESC 关闭
                </p>
              )}

              {/* 给 /search/ 页留一个入口：无 JS 环境或想用整页搜索时仍可达，
                  否则那个页面会成为没有任何内链的孤儿页。 */}
              <div className="mt-1 border-t border-line/60 px-3 pt-2 pb-1">
                <Link
                  href="/search/"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-muted transition-colors hover:text-accent"
                >
                  打开完整搜索页 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
