import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createSlugger } from "@/lib/rehype-heading-ids";
import { getAllPosts, getPostStats, getPostToc, TOC_MIN_ENTRIES } from "@/lib/posts";
import { OG_DEFAULT_IMAGE, withRss, withRssCanonical } from "@/lib/seo";
import { SITE_CONFIG } from "@/site.config";

/**
 * 本轮新增功能的回归护栏。
 * 对应实现时的两个真实坑：
 * 1. 页面自定义 openGraph 会屏蔽继承的 opengraph-image 文件约定，
 *    因此凡是自定义了 openGraph 的页面都必须显式带 images。
 * 2. 目录锚点由 rehype 插件生成、TOC 由 lib/posts 提取，
 *    两者必须用同一份 slug 逻辑，否则锚点全部失效。
 */

describe("createSlugger", () => {
  it("小写、空格转连字符", () => {
    expect(createSlugger().slug("Hello World")).toBe("hello-world");
  });

  it("保留中文", () => {
    expect(createSlugger().slug("环境变量")).toBe("环境变量");
  });

  it("去掉常见标点", () => {
    expect(createSlugger().slug("Docker: 部署?")).toBe("docker-部署");
  });

  it("重复标题追加序号", () => {
    const s = createSlugger();
    expect(s.slug("安装")).toBe("安装");
    expect(s.slug("安装")).toBe("安装-1");
    expect(s.slug("安装")).toBe("安装-2");
  });

  it("空标题回退为 section", () => {
    expect(createSlugger().slug("   ")).toBe("section");
  });
});

describe("withRss / withRssCanonical", () => {
  it("withRss 只输出 RSS 自动发现", () => {
    const a = withRss();
    expect(a.canonical).toBeUndefined();
    expect(a.types?.["application/rss+xml"]).toBeDefined();
  });

  it("withRssCanonical 同时输出 canonical 与 RSS", () => {
    const a = withRssCanonical("https://tius.cn/blog/");
    expect(a.canonical).toBe("https://tius.cn/blog/");
    expect(a.types?.["application/rss+xml"]).toBeDefined();
  });

  it("指向 SITE_CONFIG.feedPath", () => {
    const a = withRss();
    const list = a.types?.["application/rss+xml"] as Array<{ url: string }>;
    expect(list[0].url).toBe(SITE_CONFIG.feedPath);
  });
});

describe("ogDefaultImage 路径约定", () => {
  it("默认卡片路径是 public 下的静态文件", () => {
    expect(OG_DEFAULT_IMAGE.startsWith("/")).toBe(true);
    expect(OG_DEFAULT_IMAGE).not.toMatch(/\?/); // 不能带内容哈希，否则无法硬编码
  });
});

describe("getPostStats", () => {
  const slugs = getAllPosts().map((p) => p.slug);

  it("每篇文章都能算出统计", () => {
    for (const slug of slugs) {
      const s = getPostStats(slug);
      expect(s.count, slug).toBeGreaterThan(0);
      expect(s.minutes, slug).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(s.minutes), slug).toBe(true);
    }
  });

  it("正文越长统计越大", () => {
    const counts = slugs.map((s) => getPostStats(s).count);
    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
  });
});

describe("getPostToc", () => {
  const bySlug = new Map(getAllPosts().map((p) => [p.slug, getPostToc(p.slug)]));

  it("锚点与 getPostToc 使用同一 slug 逻辑（无非法字符）", () => {
    for (const [slug, entries] of bySlug) {
      for (const e of entries) {
        expect(e.id, `${slug} -> ${e.text}`).not.toMatch(/[\s?#&/\\]/);
      }
    }
  });

  it("只收 h2 / h3", () => {
    for (const entries of bySlug.values()) {
      for (const e of entries) expect([2, 3]).toContain(e.depth);
    }
  });

  it("id 唯一", () => {
    for (const [slug, entries] of bySlug) {
      const ids = entries.map((e) => e.id);
      expect(new Set(ids).size, slug).toBe(ids.length);
    }
  });

  it("不把代码块里的 # 当成标题", () => {
    for (const entries of bySlug.values()) {
      for (const e of entries) {
        expect(e.text).not.toContain("```");
      }
    }
  });

  it("存在「有目录」与「无目录」两种文章，阈值才有意义", () => {
    const counts = [...bySlug.values()].map((v) => v.length);
    expect(counts.some((c) => c >= TOC_MIN_ENTRIES)).toBe(true);
    expect(counts.some((c) => c < TOC_MIN_ENTRIES)).toBe(true);
  });
});

/**
 * 源码层面的护栏：任何自定义了 openGraph 的页面都必须显式声明 images。
 * 这是本轮最容易回归的点——漏加不会有任何报错，只是分享出去没有图。
 */
describe("页面 metadata 不会漏掉 og:image", () => {
  const appDir = path.join(process.cwd(), "src", "app");

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith(".tsx")) out.push(p);
    }
    return out;
  }

  const offenders: string[] = [];
  for (const file of walk(appDir)) {
    const text = fs.readFileSync(file, "utf8");
    if (!/openGraph:\s*\{/.test(text)) continue;
    // posts/[slug] 例外：它由同段的 opengraph-image.tsx 提供专属卡片
    if (file.includes("posts")) continue;
    // layout 已为所有页面提供默认值，不在此列
    if (!text.includes("images: ogDefaultImage()")) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }

  it("没有页面漏声明 images", () => {
    expect(offenders, `缺少 images: ogDefaultImage() 的文件：\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });
});
