import { getAllPosts, getAllCategories, getAllTags } from "@/lib/posts";
import { getAllPages } from "@/lib/pages";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

export default function sitemap() {
  const posts = getAllPosts();
  const categories = getAllCategories();
  const tags = getAllTags();

  const baseUrl = SITE_CONFIG.siteUrl;

  const staticRoutes = [
    "",
    "/archive/",
    "/blog/",
    "/categories/",
    "/columns/",
    "/memos/",
    "/tags/",
    "/rss.xml",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  const pageRoutes = getAllPages().map((page) => ({
    url: `${baseUrl}/pages/${encodeURIComponent(page.slug)}/`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${encodeURIComponent(post.slug)}/`,
    lastModified: new Date(post.meta.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const categoryRoutes = categories.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat.name)}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tagRoutes = tags.map((tag) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tag.name)}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...pageRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes];
}