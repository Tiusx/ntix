"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_CONFIG } from "@/site.config";
import { NAV_GROUPS, activeGroup, activeItem, type NavItem } from "@/lib/nav";
import { SearchOverlay } from "@/components/search-overlay";

/**
 * 主导航：分类接管式。
 *
 * 进入某个分类后，导航整体换成该分类的子项——在「博客」下的文章列表、文章详情、
 * 归档、栏目里，顶部始终只有「文章 / 归档 / 栏目」，不再出现四个大类。
 * 分类没有子项时（关于）不显示分类内导航；只有在分类之外（搜索页、404）
 * 才显示四个大类。
 *
 * RSS 入口只在首页的社交栏出现，主题切换固定在右下角（见 layout），
 * 页头工具区只留搜索。
 *
 * 做成客户端组件只为拿到 pathname 做高亮；工具区（搜索 / 主题）保持原来的
 * 形状系统，不额外引入盒子。
 */
export function Header() {
  const pathname = usePathname() ?? "/";
  const group = activeGroup(pathname);
  const current = group ? activeItem(group, pathname) : null;

  // 分类内 → 子项；分类外 → 四个大类。两种情形结构一致，只是数据源不同。
  const links: NavItem[] = group
    ? group.items
    : NAV_GROUPS.map(({ href, label }) => ({ href, label }));

  return (
    <header className="content py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href="/"
          className="logo-glitch shrink-0"
          data-text={SITE_CONFIG.title}
          aria-label={SITE_CONFIG.title}
        >
          {SITE_CONFIG.title}
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 sm:gap-x-4">
          {links.length > 0 ? (
            <nav
              className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm sm:gap-x-5"
              aria-label={group ? `${group.label}导航` : "主导航"}
            >
              {links.map((item) => {
                const active = group !== null && current?.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 whitespace-nowrap border-b pb-0.5 transition-colors ${
                      active
                        ? "border-accent text-ink"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {links.length > 0 ? (
            <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
          ) : null}

          <div className="flex shrink-0 items-center gap-1.5">
            <SearchOverlay />
          </div>
        </div>
      </div>
    </header>
  );
}
