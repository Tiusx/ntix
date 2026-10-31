/**
 * 站点导航的唯一数据源：四个一级分类 + 各自子项。
 *
 * 首页与页头都从这里取数据，避免「首页显示一套、页头又是另一套」。
 *
 * 一级分类的落地页就是各自的默认子项：
 * - 博客 → /blog/（文章）
 * - 发现 → /memos/（碎碎念）
 * - 朋友圈 → /pages/friends/（友链）
 * - 关于 → /pages/about/，**没有子项**，所以页头在关于页不显示分类内导航
 *
 * `match` 决定高亮：文章详情归「博客」，分类/标签页归「栏目」，
 * 友圈/留言板归「朋友圈」。不写 match 时默认按 href 前缀匹配。
 */
export interface NavItem {
  href: string;
  label: string;
  match?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  href: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "blog",
    label: "博客",
    href: "/blog/",
    items: [
      { href: "/blog/", label: "文章", match: ["/blog/", "/posts/"] },
      { href: "/archive/", label: "归档" },
      { href: "/columns/", label: "栏目", match: ["/columns/", "/categories/", "/tags/"] },
    ],
  },
  {
    id: "discover",
    label: "发现",
    href: "/memos/",
    items: [
      { href: "/gallery/", label: "相册" },
      { href: "/memos/", label: "碎碎念" },
    ],
  },
  {
    id: "activity",
    label: "朋友圈",
    // 点「朋友圈」直接落到友链，不再经过分类首页
    href: "/pages/friends/",
    items: [
      { href: "/pages/friends/", label: "友链" },
      { href: "/guestbook/", label: "留言板" },
      { href: "/circle/", label: "友圈" },
    ],
  },
  {
    id: "about",
    label: "关于",
    href: "/pages/about/",
    // 单页分类，没有同级的其它页面，页头不需要分类内导航
    items: [],
  },
];

/** 路径是否属于某个板块。兼容带不带结尾斜杠两种形态。 */
export function isActivePath(pathname: string, prefix: string): boolean {
  const base = prefix.replace(/\/$/, "");
  return pathname === prefix || pathname === base || pathname.startsWith(prefix);
}

function matches(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => isActivePath(pathname, pattern));
}

/** 当前路径属于哪个一级分类；都不属于（首页、搜索页）返回 null。 */
export function activeGroup(pathname: string): NavGroup | null {
  return (
    NAV_GROUPS.find((group) =>
      matches(pathname, [
        group.href,
        ...group.items.flatMap((item) => item.match ?? [item.href]),
      ]),
    ) ?? null
  );
}

/** 当前分类下命中的子项；例如 /posts/x/ 命中「文章」。 */
export function activeItem(group: NavGroup, pathname: string): NavItem | null {
  return (
    group.items.find((item) => matches(pathname, item.match ?? [item.href])) ?? null
  );
}
