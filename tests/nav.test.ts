import { describe, expect, it } from "vitest";
import { NAV_GROUPS, activeGroup, activeItem, isActivePath } from "@/lib/nav";
import { allRoutePaths } from "@/lib/routes";
import { SITE_CONFIG } from "@/site.config";

/**
 * 两级导航的一致性护栏。
 *
 * 首页和页头共用 NAV_GROUPS，任何一个子项指向不存在的页面都会在这里红。
 * 注意这里用 allRoutePaths 而不是 staticRoutePaths：友链、关于是 /pages/ 下的
 * 自定义页，不属于静态路由。
 */

const routes = new Set(allRoutePaths(SITE_CONFIG.postsPerPage));

function group(id: string) {
  const found = NAV_GROUPS.find((entry) => entry.id === id);
  if (!found) throw new Error(`缺少分组 ${id}`);
  return found;
}

describe("导航分组", () => {
  it("每个分组与子项都指向真实路由", () => {
    for (const entry of NAV_GROUPS) {
      expect(
        routes.has(entry.href),
        `分组「${entry.label}」的落地页 ${entry.href} 不存在`,
      ).toBe(true);
      for (const item of entry.items) {
        expect(routes.has(item.href), `子项「${item.label}」指向不存在的 ${item.href}`).toBe(true);
      }
    }
  });

  it("分组 id 与落地页不重复", () => {
    expect(new Set(NAV_GROUPS.map((entry) => entry.id)).size).toBe(NAV_GROUPS.length);
    expect(new Set(NAV_GROUPS.map((entry) => entry.href)).size).toBe(NAV_GROUPS.length);
  });

  it("文章详情归「博客」，分类与标签归「栏目」", () => {
    expect(activeGroup("/posts/foo/")?.label).toBe("博客");
    expect(activeItem(group("blog"), "/posts/foo/")?.label).toBe("文章");
    expect(activeItem(group("blog"), "/tags/docker/")?.label).toBe("栏目");
  });

  it("友链、留言板、友圈归「朋友圈」，友链是分类默认落点", () => {
    expect(activeGroup("/pages/friends/")?.label).toBe("朋友圈");
    expect(activeGroup("/circle/")?.label).toBe("朋友圈");
    expect(activeGroup("/guestbook/")?.label).toBe("朋友圈");
    expect(activeItem(group("activity"), "/pages/friends/")?.label).toBe("友链");
    expect(group("activity").href).toBe("/pages/friends/");
  });

  it("分类的默认落点", () => {
    // 首页四个大类的 href 就是点进去第一眼看到的页面
    expect(group("blog").href).toBe("/blog/");
    expect(group("discover").href).toBe("/memos/"); // 直接落碎碎念，不经过相册
    expect(group("activity").href).toBe("/pages/friends/"); // 直接落友链
    expect(group("about").href).toBe("/pages/about/");
  });

  it("每个有子项的分类，落地页都在自己的子项里", () => {
    for (const entry of NAV_GROUPS) {
      if (entry.items.length === 0) continue;
      const hit = entry.items.some((item) => item.href === entry.href);
      expect(hit, `「${entry.label}」的落地页 ${entry.href} 不在子项里`).toBe(true);
    }
  });

  it("关于没有子项，页头不显示分类内导航", () => {
    expect(activeGroup("/pages/about/")?.label).toBe("关于");
    expect(group("about").items).toHaveLength(0);
  });

  it("相册与碎碎念归「发现」", () => {
    expect(activeGroup("/gallery/")?.label).toBe("发现");
    expect(activeGroup("/memos/2/")?.label).toBe("发现");
    expect(activeItem(group("discover"), "/memos/")?.label).toBe("碎碎念");
  });

  it("首页与搜索页不归属任何分类", () => {
    expect(activeGroup("/")).toBeNull();
    expect(activeGroup("/search/")).toBeNull();
  });

  it("isActivePath 兼容带不带结尾斜杠", () => {
    expect(isActivePath("/blog", "/blog/")).toBe(true);
    expect(isActivePath("/blog/", "/blog/")).toBe(true);
    expect(isActivePath("/blogger/", "/blog/")).toBe(false);
  });
});
