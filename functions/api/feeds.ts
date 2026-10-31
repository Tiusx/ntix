import { collectFeeds } from "../../src/lib/feeds";
import { FEED_SOURCES } from "../../src/feeds.config";

/**
 * Cloudflare Pages Function：/api/feeds
 *
 * 浏览器不能直接抓大多数博客的 RSS（没有 CORS），所以由边缘函数代抓。
 * 数据用 Cache API 缓存 30 分钟，命中时几乎零延迟；冷缓存时并发抓 3 个源，
 * 单源 8 秒超时，不会因为某个站挂掉拖死整页。
 *
 * 只实现 GET；响应带 Access-Control-Allow-Origin: *，前端同域请求其实用不上，
 * 但保留以便将来把页面放到别的域名下复用。
 */

interface PagesContext {
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const CACHE_TTL = 1800;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
  "access-control-allow-origin": "*",
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  // caches.default 是 Cloudflare 的扩展，DOM 的 CacheStorage 类型里没有；
  // Node 里也没有 caches，所以先判存在再取。
  const cache =
    typeof caches !== "undefined"
      ? (caches as unknown as { default?: Cache }).default
      : undefined;
  const key = new Request(new URL("/api/feeds", context.request.url).toString(), {
    method: "GET",
  });

  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  try {
    const payload = await collectFeeds(FEED_SOURCES);
    const response = new Response(JSON.stringify(payload), { headers: JSON_HEADERS });
    if (cache) context.waitUntil?.(cache.put(key, response.clone()));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message, items: [], sources: [] }), {
      status: 502,
      headers: { ...JSON_HEADERS, "cache-control": "no-store" },
    });
  }
}
