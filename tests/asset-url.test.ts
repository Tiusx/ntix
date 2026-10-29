import { describe, expect, it } from "vitest";
import { toPublicAssetUrl } from "@scripts/lib/asset-url";

const options = { publicDomain: "https://r2.tius.cn", bucket: "cf-imgbed" };

/**
 * Memos 的 S3 后端返回的是几天后过期的预签名链接，直接写进静态快照会让
 * 图片在签名过期后集体 403。这些断言守住改写规则。
 */
describe("toPublicAssetUrl", () => {
  it("把 R2 S3 预签名链接改写为公开域名并丢掉签名", () => {
    const signed =
      "https://acc.r2.cloudflarestorage.com/cf-imgbed/assets/a.webp" +
      "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261027T150346Z" +
      "&X-Amz-Expires=432000&X-Amz-Signature=deadbeef&x-id=GetObject";
    expect(toPublicAssetUrl(signed, options)).toBe("https://r2.tius.cn/assets/a.webp");
  });

  it("已在公开域名但带签名参数时只清参数", () => {
    expect(
      toPublicAssetUrl("https://r2.tius.cn/assets/a.webp?X-Amz-Signature=deadbeef", options),
    ).toBe("https://r2.tius.cn/assets/a.webp");
  });

  it("保留公开域名下的多级 key", () => {
    expect(toPublicAssetUrl("https://r2.tius.cn/blog/page-1/abc.webp", options)).toBe(
      "https://r2.tius.cn/blog/page-1/abc.webp",
    );
  });

  it("桶名不匹配时不动路径", () => {
    expect(
      toPublicAssetUrl("https://acc.r2.cloudflarestorage.com/other-bucket/a.webp?X-Amz-Signature=x", options),
    ).toBe("https://r2.tius.cn/other-bucket/a.webp");
  });

  it("第三方域名原样返回（不擅自改写别人的链接）", () => {
    const url = "https://cdn.example.com/a.webp?token=1";
    expect(toPublicAssetUrl(url, options)).toBe(url);
  });

  it("非法 URL 不抛错", () => {
    expect(toPublicAssetUrl("not a url", options)).toBe("not a url");
  });
});
