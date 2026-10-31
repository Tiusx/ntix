import type { FeedSource } from "./lib/feeds";
import { friendsWithFeed } from "./lib/friends";

/**
 * 友圈抓取的源列表——从 src/data/friends.json 派生，不再单独维护。
 *
 * 规则就一条：`feed` 非空即自动订阅。新增朋友时只改 JSON，友链页和友圈同时生效；
 * feed 留空的人只出现在友链页，不会被抓取。
 *
 * 已验证的三种格式（解析层都能吃）：
 * - 封尘：WordPress，RSS 2.0
 * - 熊孝兵：Atom（feed.xml），自带 <icon> 头像
 * - 贼歪：RSS 2.0，标题用 CDATA 包裹
 */
export const FEED_SOURCES: FeedSource[] = friendsWithFeed().map((friend) => {
  const avatar = (friend.avatar ?? "").trim();
  return {
    name: friend.name,
    site: friend.site,
    feed: (friend.feed ?? "").trim(),
    ...(avatar ? { avatar } : {}),
  };
});
