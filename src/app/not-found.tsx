import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * 404 页面。
 *
 * 刻意不使用 experimental.globalNotFound：该模式绕过 root layout 直接返回页面，
 * 会让路由段内的 notFound()（如 /tags/<未分页标签>/2/、/categories/<分类>/越界页）
 * 落到 Next 内置的 __next_error__ 空壳。放在根级 not-found.tsx 则在 root layout
 * 内渲染，自动继承全局样式与主题脚本。
 *
 * 因为本文件位于 (site) 路由组之外，拿不到该组的 Header/Footer，故在此自带。
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="content flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="font-mono text-5xl font-extrabold tracking-tight text-accent md:text-6xl">
          404
        </p>
        <h1 className="mt-4 font-serif text-2xl font-extrabold tracking-tight text-ink">
          页面不存在
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
          请求的地址可能已失效、被移动，或该分页不存在。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/blog/"
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-card hover:text-accent"
          >
            浏览文章
          </Link>
          <Link
            href="/columns/"
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-card hover:text-accent"
          >
            栏目
          </Link>
          <Link
            href="/search/"
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-card hover:text-accent"
          >
            搜索
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
