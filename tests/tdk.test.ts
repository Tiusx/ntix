import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/site.config";
import {
  buildKeywords,
  postKeywords,
  descriptionOrSite,
  DESCRIPTION_MIN,
  OG_DEFAULT_IMAGE,
} from "@/lib/seo";

/**
 * TDK（title / description / keywords）护栏。
 *
 * 起因：用户用 SEO 工具检查发现 keywords 全站为空。顺带查出两个更实际的问题——
 * archive / columns / memos / search 四类页面没有 canonical；
 * pages/[slug] 的 description 兜底到了首页那句 12 字的诗。
 *
 * 注意 keywords 本身：Google 自 2009 年起不再用它排名，Bing / 百度同样忽略。
 * 保留是因为审计工具仍会读取，但别把它当排名手段——title 与 description 才是关键。
 */

describe("SITE_CONFIG", () => {
  it("metaDescription 是 SEO 描述，不是首页那句引言", () => {
    expect(SITE_CONFIG.description).not.toBe(SITE_CONFIG.metaDescription);
    expect(SITE_CONFIG.metaDescription.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
  });

  it("metaDescription 覆盖主要主题", () => {
    for (const kw of ["博客", "运维", "后端"]) {
      expect(SITE_CONFIG.metaDescription, kw).toContain(kw);
    }
  });

  it("keywords 非空且去重", () => {
    expect(SITE_CONFIG.keywords.length).toBeGreaterThan(0);
    expect(new Set(SITE_CONFIG.keywords).size).toBe(SITE_CONFIG.keywords.length);
  });
});

describe("buildKeywords", () => {
  it("页面级关键词排在站点关键词之前", () => {
    const k = buildKeywords(["Docker"]);
    expect(k[0]).toBe("Docker");
    expect(k).toContain("Tiusx");
  });

  it("自动带上站点基础词", () => {
    const k = buildKeywords(["某标签"]);
    for (const base of SITE_CONFIG.keywords) expect(k).toContain(base);
  });

  it("去重且忽略空白项", () => {
    const k = buildKeywords(["Docker", "Docker", "  ", "", "Tiusx"]);
    expect(k.filter((x) => x === "Docker")).toHaveLength(1);
    expect(k.filter((x) => x === "Tiusx")).toHaveLength(1);
    expect(k).not.toContain("");
  });

  it("不传参数时返回站点基础词", () => {
    expect(buildKeywords()).toEqual([...SITE_CONFIG.keywords]);
  });
});

describe("postKeywords", () => {
  it("包含分类与全部标签", () => {
    const k = postKeywords("开发", ["Docker", "Nginx"]);
    expect(k).toContain("开发");
    expect(k).toContain("Docker");
    expect(k).toContain("Nginx");
  });

  it("无标签时也能工作", () => {
    expect(postKeywords("随笔", [])).toContain("随笔");
  });
});

describe("descriptionOrSite", () => {
  it("描述足够长时原样返回", () => {
    const d =
      "这是一段足够长的描述文本，用于验证不会被兜底逻辑覆盖的情况，长度需要超过最小阈值。";
    expect(descriptionOrSite(d)).toBe(d);
  });

  it("过短时回退到站点描述", () => {
    expect(descriptionOrSite("太短")).toBe(SITE_CONFIG.metaDescription);
  });

  it("undefined 时回退", () => {
    expect(descriptionOrSite(undefined)).toBe(SITE_CONFIG.metaDescription);
  });

  it("绝不回退到首页那句引言（那是展示文案）", () => {
    expect(descriptionOrSite(SITE_CONFIG.description)).toBe(SITE_CONFIG.metaDescription);
  });
});

/**
 * 源码级护栏：任何页面都不得再出现「没有 canonical」或「没有 keywords」。
 * 这类缺失不会导致构建失败，只会让 SEO 工具默默扣分，因此必须靠测试兜住。
 */
describe("页面 metadata 不漏 TDK", () => {
  const appDir = path.join(process.cwd(), "src", "app");

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith(".tsx")) out.push(p);
    }
    return out;
  }

  const files = walk(appDir).filter((f) => !f.includes("not-found"));
  const offenders: string[] = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file);
    const declaresMetadata =
      /export const metadata: Metadata/.test(text) ||
      /export async function generateMetadata/.test(text);
    if (!declaresMetadata) continue;
    // 页面自己声明 metadata 就必须自备 alternates（Next 不做深合并）
    if (!/alternates:/.test(text)) {
      offenders.push(`${rel} 缺少 alternates（无 canonical / 无 RSS 自动发现）`);
    }
  }

  it("所有声明 metadata 的页面都带 alternates", () => {
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("默认分享卡片路径是可直接引用的静态文件", () => {
    expect(OG_DEFAULT_IMAGE.startsWith("/")).toBe(true);
    expect(OG_DEFAULT_IMAGE).not.toContain("?");
  });
});
