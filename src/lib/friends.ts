import raw from "@/data/friends.json";

/**
 * 友链的唯一数据源：src/data/friends.json。
 *
 * 新增一位朋友只改那个 JSON——友链页直接读它，友圈则挑出 `feed` 非空的条目
 * 自动订阅，两边不会出现「友链加了、友圈没跟上」的漂移。
 *
 * `avatar` 可以留空：页面会退回首字方块，友圈还会尝试从 feed 的 icon/logo 里取。
 * `feed` 留空表示只展示友链、不参与友圈抓取。
 */
export interface Friend {
  name: string;
  site: string;
  /** 一句话介绍，友链页展示 */
  description: string;
  avatar?: string;
  feed?: string;
}

export const FRIENDS: readonly Friend[] = raw as Friend[];

function hasFeed(friend: Friend): boolean {
  return (friend.feed ?? "").trim().length > 0;
}

/** 参与友圈抓取的友链：feed 非空即订阅。顺序与 JSON 一致。 */
export function friendsWithFeed(): Friend[] {
  return FRIENDS.filter(hasFeed);
}

/** 展示用的域名：去掉协议与 www，解析失败时原样返回。 */
export function siteHost(site: string): string {
  try {
    return new URL(site).host.replace(/^www\./, "");
  } catch {
    return site;
  }
}
