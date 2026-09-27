import { getAllPosts } from "@/lib/posts";
import {
  categoryRoutePaths,
  pageRoutePaths,
  paginatedRoutePaths,
  postRoutePaths,
  staticRoutePaths,
  tagRoutePaths,
} from "@/lib/routes";
import { getUnregisteredCategories } from "@/lib/posts";
import { SITE_CONFIG } from "@/site.config";

export const dynamic = "force-static";

/**
 * 路由清单来自 src/lib/routes.ts，与 IndexNow 提交脚本共用同一来源，
 * 避免出现「sitemap 收录了但从不主动推送」的页面。
 */
export default function sitemap() {
  const posts = getAllPosts();
  const baseUrl = SITE_CONFIG.siteUrl;
  const pageSize = SITE_CONFIG.postsPerPage;

  // 分类是「规划中的 taxonomy」：以 CATEGORY_META_KEYS 为准而非文章实际用到的分类，
  // 否则 0 文章的规划分类会被生成、被 /columns/ 内链，却不进 sitemap。
  const unregistered = getUnregisteredCategories();
  if (unregistered.length > 0) {
    console.warn(
      `⚠️  以下分类在文章中被使用，但未注册到 CATEGORY_META（src/lib/posts.ts）：${unregistered.join(", ")}\n` +
        `   这些分类不会出现在 /columns/ 与 sitemap 中。请补充注册后再发布。`,
    );
  }

  const staticRoutes = staticRoutePaths().map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "/" ? 1 : 0.8,
  }));

  const pageRoutes = pageRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const postRoutes = postRoutePaths().map((p, i) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(posts[i]?.meta.date ?? new Date()),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const categoryRoutes = categoryRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagRoutes = tagRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // 分页页：低优先级，但既然 sitemap 收录了就应该一并被 IndexNow 推送。
  // 直接取 paginatedRoutePaths()，不再自行过滤——早期用正则过滤时漏掉了
  // /blog/2/ 这类只有两段的路径。
  const paginated = paginatedRoutePaths(pageSize).map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.3,
  }));

  return [...staticRoutes, ...pageRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes, ...paginated];
}
