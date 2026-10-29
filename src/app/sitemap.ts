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
 * sitemap 的 lastModified 用「内容实际最后变化的日期」，不用构建时间。
 *
 * 此前每个路由都写 new Date()，等于每次构建把全站 90+ 个 URL 全部标记为
 * 刚刚更新；搜索引擎对这种 lastmod 两三次之后整体忽略，信噪比归零。
 */
function latestContentDate(): string {
  const posts = getAllPosts();
  return posts.reduce((max, post) => (post.meta.date > max ? post.meta.date : max), "");
}

function asDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * 路由清单来自 src/lib/routes.ts，与 IndexNow 提交脚本共用同一来源，
 * 避免出现「sitemap 收录了但从不主动推送」的页面。
 */
export default function sitemap() {
  const posts = getAllPosts();
  const baseUrl = SITE_CONFIG.siteUrl.replace(/\/$/, "");
  const pageSize = SITE_CONFIG.postsPerPage;
  const siteUpdated = asDate(latestContentDate());

  // 分类是「规划中的 taxonomy」：以 CATEGORY_META_KEYS 为准而非文章实际用到的分类，
  // 否则 0 文章的规划分类会被生成、被 /columns/ 内链，却不进 sitemap。
  const unregistered = getUnregisteredCategories();
  if (unregistered.length > 0) {
    console.warn(
      `⚠️  以下分类在文章中被使用，但未注册到 CATEGORY_META（src/lib/posts.ts）：${unregistered.join(", ")}\n` +
        `   这些分类不会出现在 /columns/ 与 sitemap 中。请补充注册后再发布。`,
    );
  }

  // 文章页：用各自动发布日期。按 slug 取日期，不再依赖数组下标顺序——
  // 之前 postRoutePaths() 与 posts[i] 的对应关系是隐式的，改动任一排序就会错位。
  const postDates = new Map(
    posts.map((post) => [`${baseUrl}/posts/${encodeURIComponent(post.slug)}/`, post.meta.date]),
  );

  const staticRoutes = staticRoutePaths().map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: siteUpdated,
    changeFrequency: "weekly" as const,
    priority: route === "/" ? 1 : 0.8,
  }));

  const pageRoutes = pageRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: siteUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const postRoutes = postRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: asDate(postDates.get(`${baseUrl}${p}`) ?? ""),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const categoryRoutes = categoryRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: siteUpdated,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagRoutes = tagRoutePaths().map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: siteUpdated,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // 分页页：低优先级，但既然 sitemap 收录了就应该一并被 IndexNow 推送。
  // 直接取 paginatedRoutePaths()，不再自行过滤——早期用正则过滤时漏掉了
  // /blog/2/ 这类只有两段的路径。
  const paginated = paginatedRoutePaths(pageSize).map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: siteUpdated,
    changeFrequency: "weekly" as const,
    priority: 0.3,
  }));

  return [...staticRoutes, ...pageRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes, ...paginated];
}
