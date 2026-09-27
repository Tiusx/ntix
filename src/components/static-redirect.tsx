import type { Metadata } from "next";
import Link from "next/link";
import { RedirectClient } from "./redirect-client";

/**
 * 静态导出下的跳转页。
 *
 * 为什么不用 next/navigation 的 redirect()：Next 官方把 Redirects 列为
 * output:"export" 不支持的功能（见 dist/docs/01-app/02-guides/static-exports.md），
 * 实际产出的只是一个 HTTP 200 的空白页——访客看到的是空页面，
 * 搜索引擎也会把它当作无内容的重复页。
 *
 * 这里用四件事覆盖各种情况：
 * 1. <meta http-equiv="refresh">  绝大多数浏览器与爬虫都认，且不依赖 JS
 * 2. <link rel="canonical">        明确告诉搜索引擎正主是目标页
 * 3. <meta name="robots" noindex>  避免跳转页本身被索引
 * 4. 可见链接 + 客户端 replace     兜底，且不污染历史记录
 */
export function buildRedirectMetadata(to: string, label: string): Metadata {
  return {
    title: `已迁移至${label}`,
    alternates: { canonical: to },
    robots: { index: false, follow: true },
  };
}

export function StaticRedirect({ to, label }: { to: string; label: string }) {
  return (
    <main className="content flex min-h-[50svh] flex-col items-center justify-center py-16 text-center">
      {/* React 19 会把 <meta> 自动提升到 <head>，因此这里能安全地输出 http-equiv */}
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <p className="text-sm text-muted">此页面已迁移至</p>
      <Link
        href={to}
        className="mt-2 text-lg font-semibold text-accent underline underline-offset-4"
      >
        {label}
      </Link>
      <RedirectClient to={to} />
    </main>
  );
}
