import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import { getAllPages, getPage } from "@/lib/pages";
import { withRssCanonical } from "@/lib/seo";
import { GiscusComments } from "@/components/giscus-comments";
import { SITE_CONFIG } from "@/site.config";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPages().map((page) => ({ slug: page.slug }));
}

// ```timeline 代码围栏 → 时间线；每行 `时间 描述`（时间可用任意前缀 token）
const markdownComponents: Components = {
  a({ href, children }) {
    const external = href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  },
  pre({ node, children }) {
    // 仅吊销 timeline 的外层 <pre>，其余代码块保持默认
    const firstChild = node?.children?.[0];
    const isTimeline =
      firstChild?.type === "element" &&
      Array.isArray(firstChild.properties?.className) &&
      (firstChild.properties.className as string[]).includes(
        "language-timeline",
      );
    return isTimeline ? <>{children}</> : <pre>{children}</pre>;
  },
  code({ className, children }) {
    const isTimeline = /language-timeline/.test(className ?? "");
    if (!isTimeline) {
      return (
        <code className={className}>{children}</code>
      );
    }
    const lines = String(children ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return null;
    return (
      <ol className="timeline">
        {lines.map((line, index) => {
          const match = /^(\S+)\s+(.*)$/.exec(line);
          return (
            <li key={index}>
              {match ? (
                <>
                  <time>{match[1]}</time>
                  <span>{match[2]}</span>
                </>
              ) : (
                <span>{line}</span>
              )}
            </li>
          );
        })}
      </ol>
    );
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) return { title: "未找到" };

  return {
    title: page.title || SITE_CONFIG.title,
    description: page.description || SITE_CONFIG.description,
    alternates: withRssCanonical(`${SITE_CONFIG.siteUrl}/pages/${page.slug}/`),
  };
}

export default async function PagesLayout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) notFound();

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        {page.title}
      </h1>
      {page.description ? (
        <p className="mb-10 text-base text-muted">{page.description}</p>
      ) : null}

      <article className="prose max-w-[40rem]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {page.content}
        </ReactMarkdown>
      </article>

      {page.comment ? <GiscusComments /> : null}
    </main>
  );
}