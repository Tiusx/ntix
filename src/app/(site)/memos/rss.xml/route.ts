import { getAllMemos } from "@/lib/memos";
import { stripInlineMarkdown } from "@/lib/text";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

/**
 * 碎碎念的独立 RSS。
 *
 * 主 feed `/rss.xml` 只放文章——生活碎片混进去会淹掉订阅者想看的正文。
 * 这里单独出一条，链接尽量深到具体某条（/memos/#slug，分页时带上页码），
 * 读者点开就能定位到那一条。
 */

const MEMOS_PER_PAGE = 20;

function escapeXml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value.replace(/[&<>"']/g, (char) => replacements[char]);
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function memoTitle(content: string, date: string): string {
  const text = stripInlineMarkdown(content);
  const first = text.split(/\n+/).map((line) => line.trim()).find(Boolean) ?? "";
  if (!first) {
    const day = date.slice(5, 10).replace("-", ".");
    return `碎碎念 · ${day}`;
  }
  const chars = [...first];
  return chars.length > 42 ? `${chars.slice(0, 42).join("")}…` : first;
}

function memoHtml(content: string): string {
  // 按空行分段，再逐段剥行内语法——stripInlineMarkdown 会把换行压平，
  // 整段丢进去会变成一堵字墙。
  return content
    .split(/\n{2,}/)
    .map((block) => stripInlineMarkdown(block))
    .filter(Boolean)
    .map((text) => `<p>${escapeXml(text)}</p>`)
    .join("");
}

export function GET(): Response {
  const baseUrl = SITE_CONFIG.siteUrl.replace(/\/$/, "");
  const memos = getAllMemos();
  const latest = memos[0]?.date ?? "";

  const items = memos.map((memo, index) => {
    const page = Math.floor(index / MEMOS_PER_PAGE) + 1;
    const link = `${baseUrl}/memos/${page === 1 ? "" : `${page}/`}#${encodeURIComponent(memo.slug)}`;
    const attachments = memo.attachments
      .map((attachment) =>
        attachment.type.startsWith("image/")
          ? `<p><img src="${escapeXml(attachment.externalLink)}" alt="${escapeXml(attachment.name)}" /></p>`
          : `<p><a href="${escapeXml(attachment.externalLink)}">${escapeXml(attachment.name)}</a></p>`,
      )
      .join("");
    const tags = memo.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("");

    return `    <item>
      <title>${escapeXml(memoTitle(memo.content, memo.date))}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(memo.date).toUTCString()}</pubDate>
      ${tags}
      <description>${cdata(`${memoHtml(memo.content)}${attachments}`)}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_CONFIG.title} · 碎碎念</title>
    <link>${baseUrl}/memos/</link>
    <description>${SITE_CONFIG.title} 的日常碎片与随手记录。</description>
    <language>${SITE_CONFIG.lang}</language>
    <lastBuildDate>${latest ? new Date(latest).toUTCString() : new Date(0).toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/memos/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
