import { getAllPosts } from "@/lib/posts";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

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

export function GET(): Response {
  const posts = getAllPosts();

  const items = posts
    .map((post) => {
      const { title, date, summary, category, tags } = post.meta;
      const link = `${SITE_CONFIG.siteUrl}/posts/${encodeURIComponent(post.slug)}/`;
      const categories =
        (category ? [category] : []).concat(tags).map(
          (name) => `<category>${escapeXml(name)}</category>`,
        ).join("") || "";
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      ${categories}
      ${summary ? `<description>${escapeXml(summary)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_CONFIG.title)}</title>
    <link>${SITE_CONFIG.siteUrl}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
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