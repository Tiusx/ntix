import { CATEGORY_META_KEYS, getAllPosts, getAllTags, getUnregisteredCategories } from "@/lib/posts";
import { getAllPages } from "@/lib/pages";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

export default function sitemap() {
  const posts = getAllPosts();
  const tags = getAllTags();

  const baseUrl = SITE_CONFIG.siteUrl;

  // 分类是「规划中的 taxonomy」：以 CATEGORY_META_KEYS 为准而非文章实际用到的分类，
  // 否则 0 文章的规划分类会被生成、被 /columns/ 内链，却不进 sitemap。
  const unregistered = getUnregisteredCategories();
  if (unregistered.length > 0) {
    console.warn(
      `⚠️  以下分类在文章中被使用，但未注册到 CATEGORY_META（src/lib/posts.ts）：${unregistered.join(", ")}\n` +
        `   这些分类不会出现在 /columns/ 与 sitemap 中。请补充注册后再发布。`,
    );
  }

  const staticRoutes = [
    "",
    "/archive/",
    "/blog/",
    "/categories/",
    "/columns/",
    "/memos/",
    "/search/",
    "/tags/",
    "/rss.xml",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const pageRoutes = getAllPages().map((page) => ({
    url: `${baseUrl}/pages/${encodeURIComponent(page.slug)}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${encodeURIComponent(post.slug)}/`,
    lastModified: new Date(post.meta.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const categoryRoutes = CATEGORY_META_KEYS.map((name) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(name)}/`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagRoutes = tags.map((tag) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tag.name)}/`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...pageRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes];
}
