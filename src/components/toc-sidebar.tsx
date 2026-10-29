"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/headings";

/**
 * 宽屏下的侧边粘性目录。
 *
 * 与顶部卡片版的分工：小屏用顶部卡片（`Toc`，纯服务端），xl 以上用这个固定
 * 在右侧的版本。只有它需要客户端 JS —— 滚动高亮必须知道当前视口在哪个小节。
 *
 * 高亮用 IntersectionObserver + 一条「观察带」（rootMargin 顶部让出 96px，
 * 底部留 70% 不响应），比 scroll 事件便宜得多，也不会每次滚动都触发布局读取。
 */
export function TocSidebar({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (entries.length === 0) return;
    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav
      aria-label="本文目录"
      className="fixed top-24 left-[calc(50%+24.5rem)] hidden max-h-[calc(100vh-12rem)] w-[11rem] overflow-y-auto xl:block"
    >
      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">本文目录</p>
      <ul className="mt-2.5 space-y-0.5 text-[0.78rem] leading-snug">
        {entries.map((entry) => {
          const active = entry.id === activeId;
          return (
            <li
              key={entry.id}
              className={`border-l ${active ? "border-accent" : "border-line/70"}`}
            >
              <a
                href={`#${entry.id}`}
                aria-current={active ? "true" : undefined}
                className={`block py-0.5 transition-colors ${entry.depth === 3 ? "pl-5" : "pl-3"} ${
                  active ? "text-accent" : "text-sub hover:text-accent"
                }`}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
