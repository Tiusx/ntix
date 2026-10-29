import { describe, expect, it } from "vitest";
import { parseImageMeta } from "@/lib/image-meta";

/**
 * 图床把尺寸挂在 URL fragment 上，这层解析决定了图片是否有 width/height 属性，
 * 也就决定了文章页会不会抖 CLS。
 */
describe("parseImageMeta", () => {
  it("取出宽高并剥掉 fragment", () => {
    expect(
      parseImageMeta("https://rimg.tius.cn/images/abc.png#blurhash=L36Hy7&width=1115&height=102"),
    ).toEqual({
      src: "https://rimg.tius.cn/images/abc.png",
      width: 1115,
      height: 102,
      blurhash: "L36Hy7",
    });
  });

  it("没有 fragment 时原样返回", () => {
    expect(parseImageMeta("https://r2.tius.cn/a.webp")).toEqual({ src: "https://r2.tius.cn/a.webp" });
  });

  it("没有宽高时只保留 src", () => {
    expect(parseImageMeta("https://r2.tius.cn/a.webp#blurhash=L36Hy7").src).toBe(
      "https://r2.tius.cn/a.webp",
    );
  });

  it("忽略非法宽高", () => {
    const meta = parseImageMeta("https://r2.tius.cn/a.webp#width=abc&height=-3");
    expect(meta.width).toBeUndefined();
    expect(meta.height).toBeUndefined();
  });

  it("fragment 内的百分号编码可被解码", () => {
    expect(parseImageMeta("https://r2.tius.cn/a.webp#blurhash=L99H2%2Bof").blurhash).toBe("L99H2+of");
  });
});
