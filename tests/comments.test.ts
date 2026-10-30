import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 评论区提供方选择逻辑的回归护栏。
 *
 * `src/lib/comments.ts` 里的可用性常量是模块级求值的，所以每组用例都要
 * 先改环境变量、再 resetModules 重新导入，否则拿到的是上一轮的缓存。
 * 对应实现时的三个真实坑：
 * 1. `NEXT_PUBLIC_COMMENT_PROVIDER=waline` 但没配服务地址时不能白屏，
 *    要退回到另一套可用的；
 * 2. `none` 必须让整块评论区消失，而不是显示一个空壳；
 * 3. Giscus 四项配置缺一项就不能算可用，否则 iframe 会静默失败。
 */

const GISCUS_KEYS = [
  "NEXT_PUBLIC_COMMENT_PROVIDER",
  "NEXT_PUBLIC_GISCUS_REPO",
  "NEXT_PUBLIC_GISCUS_REPO_ID",
  "NEXT_PUBLIC_GISCUS_CATEGORY",
  "NEXT_PUBLIC_GISCUS_CATEGORY_ID",
  "NEXT_PUBLIC_WALINE_SERVER_URL",
] as const;

const GISCUS_FULL = {
  NEXT_PUBLIC_GISCUS_REPO: "owner/repo",
  NEXT_PUBLIC_GISCUS_REPO_ID: "R_1",
  NEXT_PUBLIC_GISCUS_CATEGORY: "Announcements",
  NEXT_PUBLIC_GISCUS_CATEGORY_ID: "DIC_1",
};

type CommentsModule = typeof import("@/lib/comments");

async function loadComments(env: Record<string, string | undefined>): Promise<CommentsModule> {
  vi.resetModules();
  for (const key of GISCUS_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  return import("@/lib/comments");
}

afterEach(() => {
  for (const key of GISCUS_KEYS) delete process.env[key];
  vi.resetModules();
});

describe("defaultCommentProvider", () => {
  it("两套都可用且未指定时，默认走 Giscus", async () => {
    const mod = await loadComments({ ...GISCUS_FULL, NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com" });
    expect(mod.defaultCommentProvider()).toBe("giscus");
  });

  it("指定 waline 且已配置时走 Waline", async () => {
    const mod = await loadComments({
      ...GISCUS_FULL,
      NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com",
      NEXT_PUBLIC_COMMENT_PROVIDER: "waline",
    });
    expect(mod.defaultCommentProvider()).toBe("waline");
  });

  it("指定 waline 但没配服务地址，退到 Giscus", async () => {
    const mod = await loadComments({ ...GISCUS_FULL, NEXT_PUBLIC_COMMENT_PROVIDER: "waline" });
    expect(mod.defaultCommentProvider()).toBe("giscus");
  });

  it("指定 giscus 但 Giscus 没配好，退到 Waline", async () => {
    const mod = await loadComments({
      NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com",
      NEXT_PUBLIC_COMMENT_PROVIDER: "giscus",
    });
    expect(mod.defaultCommentProvider()).toBe("waline");
  });

  it("none 让整块评论区不渲染", async () => {
    const mod = await loadComments({
      ...GISCUS_FULL,
      NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com",
      NEXT_PUBLIC_COMMENT_PROVIDER: "none",
    });
    expect(mod.defaultCommentProvider()).toBeNull();
  });

  it("大小写与空白不敏感", async () => {
    const mod = await loadComments({
      ...GISCUS_FULL,
      NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com",
      NEXT_PUBLIC_COMMENT_PROVIDER: "  Waline  ",
    });
    expect(mod.defaultCommentProvider()).toBe("waline");
  });

  it("无法识别的值退到第一套可用的", async () => {
    const mod = await loadComments({
      ...GISCUS_FULL,
      NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com",
      NEXT_PUBLIC_COMMENT_PROVIDER: "disqus",
    });
    expect(mod.defaultCommentProvider()).toBe("giscus");
  });

  it("两套都没配时不渲染", async () => {
    const mod = await loadComments({});
    expect(mod.defaultCommentProvider()).toBeNull();
  });

  it("只配了 Waline 时默认就是 Waline", async () => {
    const mod = await loadComments({ NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com" });
    expect(mod.defaultCommentProvider()).toBe("waline");
  });
});

describe("可用性判定", () => {
  it("Giscus 四项齐全才算可用", async () => {
    const mod = await loadComments({ ...GISCUS_FULL });
    expect(mod.GISCUS_ENABLED).toBe(true);
    expect(mod.COMMENT_PROVIDERS).toEqual(["giscus"]);
  });

  it("Giscus 缺任意一项都不可用", async () => {
    for (const key of Object.keys(GISCUS_FULL) as (keyof typeof GISCUS_FULL)[]) {
      const partial = { ...GISCUS_FULL };
      delete partial[key];
      const mod = await loadComments(partial);
      expect(mod.GISCUS_ENABLED, `缺少 ${key} 时应判定为不可用`).toBe(false);
    }
  });

  it("有服务地址 Waline 才可用，空字符串不算", async () => {
    expect((await loadComments({ NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com" })).WALINE_ENABLED).toBe(
      true,
    );
    expect((await loadComments({ NEXT_PUBLIC_WALINE_SERVER_URL: "" })).WALINE_ENABLED).toBe(false);
  });

  it("两套都可用时顺序固定为 giscus 在前", async () => {
    const mod = await loadComments({ ...GISCUS_FULL, NEXT_PUBLIC_WALINE_SERVER_URL: "https://w.example.com" });
    expect(mod.COMMENT_PROVIDERS).toEqual(["giscus", "waline"]);
  });
});
