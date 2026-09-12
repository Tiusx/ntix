import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/site.config";

export const metadata: Metadata = {
  title: "关于",
  description: SITE_CONFIG.description,
};

export default function AboutPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        关于
      </h1>
      <p className="mb-10 text-base text-muted">
        {SITE_CONFIG.tagline}
      </p>

      <article className="prose max-w-[40rem]">
        <p>
          你好，我是 {SITE_CONFIG.title}。
          {SITE_CONFIG.description}
        </p>

        <h2>这个博客</h2>
        <p>
          基于 Next.js（App Router）静态导出的独立博客，零服务器依赖，
          产物只有纯 HTML / CSS / JS，部署在 Cloudflare Pages。
          写程序、生活与日常思考，也把折腾过程的踩坑整理成文。
        </p>

        <h2>关于 Memos</h2>
        <p>
          首页「说说」同步自自建的 Memos 实例，通过匿名公开 API 在构建时拉取快照，
          支持标签过滤、分页，图片来自 R2 对象存储。
        </p>

        <h2>联系</h2>
        <p>
          博客导航里有 <Link href="/friends/" className="text-accent hover:underline">友链</Link>
          ，也欢迎通过邮箱交流。
        </p>
      </article>
    </main>
  );
}