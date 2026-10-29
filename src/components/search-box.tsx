"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { highlight, searchEntries, snippet } from "@/lib/search";
import type { SearchEntry } from "@/lib/search-index";

export function SearchBox() {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data: SearchEntry[]) => setEntries(data))
      .catch((err) => {
        setFailed(true);
        console.error("加载搜索索引失败", err);
      });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      // Ctrl/Cmd+K 与 / 都能聚焦；输入中或带修饰键时不劫持
      const isShortcut =
        ((e.metaKey || e.ctrlKey) && e.key === "k") ||
        (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey);

      if (isShortcut) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => (query.trim() ? searchEntries(entries, query, 20) : []), [entries, query]);

  const q = query.trim();

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文章（按 / 聚焦）"
          className="w-full rounded-lg border border-line bg-card px-4 py-2.5 pr-16 text-sm text-ink placeholder-muted outline-none transition-colors focus:border-accent"
          autoFocus
        />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-muted/10 px-1.5 py-0.5 font-mono text-[11px] text-muted">
            /
          </kbd>
      </div>

      <div className="mt-8">
        {failed && (
          <p className="text-muted">
            搜索索引未生成。本地开发时先运行 <code className="font-mono text-xs">pnpm dev</code>
            （predev 会生成 public/search-index.json）。
          </p>
        )}

        {q && results.length === 0 && !failed && (
          <p className="text-muted">没有找到匹配「{q}」的文章。</p>
        )}

        {results.map((entry) => (
          <Link
            key={entry.slug}
            href={`/posts/${entry.slug}/`}
            className="group block rounded-lg border border-transparent px-3 py-4 transition-colors hover:border-line hover:bg-card"
          >
            <div className="flex items-baseline gap-3">
              <h3 className="font-serif font-bold text-ink underline-offset-4 transition-colors group-hover:underline group-hover:decoration-accent">
                <span dangerouslySetInnerHTML={{ __html: highlight(entry.title, q) }} />
              </h3>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{entry.date}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted">
              {entry.category && <span className="rounded-full bg-muted/10 px-2 py-0.5">{entry.category}</span>}
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted/10 px-2 py-0.5">#{tag}</span>
              ))}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
              <span dangerouslySetInnerHTML={{ __html: highlight(snippet(entry.summary || entry.content, q), q) }} />
            </p>
          </Link>
        ))}

        {!q && entries.length > 0 && (
          <p className="text-muted">输入关键词搜索 {entries.length} 篇文章。</p>
        )}
      </div>
    </div>
  );
}