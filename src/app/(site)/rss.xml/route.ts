import { getAllPosts, getPostBody } from "@/lib/posts";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

/** RSS 2.0 + Atom 自引用 + content:encoded 全文。 */
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

/**
 * CDATA 包裹正文。
 * 需额外剔除 "]]>"，否则会提前闭合 CDATA 导致 XML 非法。
 */
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

export function GET(): Response {
  const posts = getAllPosts();
  const baseUrl = SITE_CONFIG.siteUrl.replace(/\/$/, "");

  // 用最新一篇文章的日期而非 new Date()：保证相同输入的构建产出相同字节。
  const latest = posts.reduce((max, p) => (p.meta.date > max ? p.meta.date : max), "");
  const lastBuildDate = new Date(latest || Date.now()).toUTCString();

  const items = posts
    .map((post) => {
      const { title, date, summary, category, tags } = post.meta;
      const link = `${baseUrl}/posts/${encodeURIComponent(post.slug)}/`;
      const categories =
        (category ? [category] : []).concat(tags).map(
          (name) => `<category>${escapeXml(name)}</category>`,
        ).join("") || "";
      const body = getPostBody(post.slug);
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      ${categories}
      ${summary ? `<description>${escapeXml(summary)}</description>` : ""}
      ${body ? `<content:encoded>${cdata(body)}</content:encoded>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.title)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <language>${escapeXml(SITE_CONFIG.lang)}</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
