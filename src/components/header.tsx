import Link from "next/link";
import { SITE_CONFIG } from "@/site.config";
import { SearchOverlay } from "@/components/search-overlay";

/**
 * 主导航。
 *
 * 两处调整：
 * - 「搜索」不再是链接：改成全站浮层，⌘K / 任意页面按 / 都能唤起，不用离开
 *   当前文章。（此前快捷键只挂在 /search/ 页面的组件里，在文章页形同虚设。）
 * - 补上「碎碎念」：/memos/ 有分页、有标签页，是个完整板块，之前只有首页
 *   角落有个入口。
 * 归档与文章并存：前者是年月时间线，后者是分页列表。
 */
const LINKS: [string, string][] = [
  ["文章", "/blog/"],
  ["归档", "/archive/"],
  ["栏目", "/columns/"],
  ["碎碎念", "/memos/"],
];

export function Header() {
  return (
    <header className="content flex items-center justify-between gap-3 py-6">
      <Link
        href="/"
        className="logo-glitch shrink-0"
        data-text={SITE_CONFIG.title}
        aria-label={SITE_CONFIG.title}
      >
        {SITE_CONFIG.title}
      </Link>
      {/* 小屏下导航放不下：允许换行到第二行，而不是横向滚动把 RSS 藏在视口外 */}
      <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm sm:gap-x-5">
        {LINKS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 whitespace-nowrap text-muted transition-colors hover:text-ink"
          >
            {label}
          </Link>
        ))}
        <span className="shrink-0">
          <SearchOverlay />
        </span>
        <a
          href="/rss.xml"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 whitespace-nowrap text-muted transition-colors hover:text-ink"
        >
          RSS
        </a>
      </nav>
    </header>
  );
}
