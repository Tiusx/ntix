"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SearchEntry } from "@/lib/search-index";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escaped = escapeHtml(text);
  const re = new RegExp(`(${safe})`, "gi");
  return escaped.replace(re, `<mark class="bg-amber-200/60 dark:bg-amber-300/30 rounded px-0.5">$1</mark>`);
}

function snippet(text: string, query: string, radius = 60): string {
  if (!query) return text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "");
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + query.length + radius);
  let s = text.slice(start, end);
  if (start > 0) s = "…" + s;
  if (end < text.length) s = s + "…";
  return s;
}

function score(entry: SearchEntry, q: string): number {
  const lower = q.toLowerCase();
  let s = 0;
  if (entry.title.toLowerCase().includes(lower)) s += 10;
  if (entry.category.toLowerCase().includes(lower)) s += 5;
  if (entry.tags.some((t) => t.toLowerCase().includes(lower))) s += 4;
  if (entry.summary.toLowerCase().includes(lower)) s += 3;
  if (entry.content.toLowerCase().includes(lower)) s += 1;
  return s;
}

export function SearchBox() {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data: SearchEntry[]) => setEntries(data))
      .catch((err) => console.error("加载搜索索引失败", err));
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

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return entries
      .map((entry) => ({ entry, score: score(entry, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.date.localeCompare(b.entry.date))
      .map((r) => r.entry)
      .slice(0, 20);
  }, [entries, query]);

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
        {q && results.length === 0 && (
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