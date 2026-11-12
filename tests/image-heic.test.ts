import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageOptions, isHeic, optimizeImage } from "@scripts/notion/image-optimizer";
import { needsRepair } from "@scripts/notion/r2-uploader";

const HEIC_FIXTURE = readFileSync(join(process.cwd(), "tests/fixtures/sample.heic"));

describe("isHeic", () => {
  it("按 ftyp brand 识别真实 HEIC", () => {
    expect(isHeic(HEIC_FIXTURE)).toBe(true);
  });

  it("不把 PNG/JPEG 误判为 HEIC", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const jpeg = await sharp(png).jpeg().toBuffer();

    expect(isHeic(png)).toBe(false);
    expect(isHeic(jpeg)).toBe(false);
  });

  it("短 buffer / 非 ftyp 容器不崩", () => {
    expect(isHeic(Buffer.alloc(4))).toBe(false);
    expect(isHeic(Buffer.from("hello world!"))).toBe(false);
  });
});

describe("optimizeImage — HEIC", () => {
  it("HEIC 转 WebP（sharp 原生解不了，走 WASM 解码）", async () => {
    const result = await optimizeImage(HEIC_FIXTURE, "heic");

    expect(result.ext).toBe("webp");
    expect(result.contentType).toBe("image/webp");
    expect(result.buffer.length).toBeGreaterThan(0);
    // 不能是原始 HEIC 字节流
    expect(result.buffer.equals(HEIC_FIXTURE)).toBe(false);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1440);
    expect(meta.height).toBe(960);
  });

  it("扩展名说谎（URL 后缀是 .jpg）时仍按字节识别并转换", async () => {
    const result = await optimizeImage(HEIC_FIXTURE, "jpg");

    expect(result.ext).toBe("webp");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
  });
});

describe("getImageOptions（环境变量）", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺省时用 2560 / q82 / 有损", () => {
    expect(getImageOptions()).toEqual({ maxWidth: 2560, quality: 82, lossless: false });
  });

  it("R2_IMAGE_MAX_WIDTH=0 表示保留原始尺寸", () => {
    vi.stubEnv("R2_IMAGE_MAX_WIDTH", "0");
    expect(getImageOptions().maxWidth).toBe(0);
  });

  it("R2_IMAGE_LOSSLESS 识别常见真值写法", () => {
    for (const v of ["1", "true", "YES", "on"]) {
      vi.stubEnv("R2_IMAGE_LOSSLESS", v);
      expect(getImageOptions().lossless, v).toBe(true);
    }
    vi.stubEnv("R2_IMAGE_LOSSLESS", "0");
    expect(getImageOptions().lossless).toBe(false);
  });

  it("非法数值回退默认，不让拼写错误悄悄关掉缩放", () => {
    vi.stubEnv("R2_IMAGE_MAX_WIDTH", "abc");
    vi.stubEnv("R2_IMAGE_QUALITY", "999");
    expect(getImageOptions()).toMatchObject({ maxWidth: 2560, quality: 82 });
  });
});

describe("optimizeImage — 缩放与无损开关", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("R2_IMAGE_MAX_WIDTH 生效", async () => {
    vi.stubEnv("R2_IMAGE_MAX_WIDTH", "600");
    const result = await optimizeImage(HEIC_FIXTURE, "heic");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(400);
  });

  it("R2_IMAGE_MAX_WIDTH=0 时保留 HEIC 原始尺寸", async () => {
    vi.stubEnv("R2_IMAGE_MAX_WIDTH", "0");
    const result = await optimizeImage(HEIC_FIXTURE, "heic");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1440);
    expect(meta.height).toBe(960);
  });

  it("R2_IMAGE_LOSSLESS=1 输出无损 WebP（体积大于有损）", async () => {
    const lossy = await optimizeImage(HEIC_FIXTURE, "heic");
    vi.stubEnv("R2_IMAGE_LOSSLESS", "1");
    const lossless = await optimizeImage(HEIC_FIXTURE, "heic");

    const meta = await sharp(lossless.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1440);
    expect(lossless.buffer.length).toBeGreaterThan(lossy.buffer.length);
  });
});

describe("needsRepair", () => {
  it("识别图床上历史遗留的原始 HEIC/HEIF 对象", () => {
    expect(needsRepair("https://r2.tius.cn/posts/abc/527317eb507f445f.heic")).toBe(true);
    expect(needsRepair("https://r2.tius.cn/posts/abc/527317eb507f445f.HEIC")).toBe(true);
    expect(needsRepair("https://r2.tius.cn/posts/abc/x.heif")).toBe(true);
  });

  it("已转换格式与其他资源不触发重跑", () => {
    expect(needsRepair("https://r2.tius.cn/posts/abc/x.webp")).toBe(false);
    expect(needsRepair("https://r2.tius.cn/posts/abc/x.png")).toBe(false);
    expect(needsRepair("https://r2.tius.cn/posts/abc/x.gif")).toBe(false);
  });
});

describe("optimizeImage — 其他格式回归", () => {
  it("JPEG 转 WebP 且保留尺寸", async () => {
    const jpeg = await sharp({
      create: { width: 64, height: 32, channels: 3, background: "#f00" },
    })
      .jpeg()
      .toBuffer();

    const result = await optimizeImage(jpeg, "jpg");
    expect(result.ext).toBe("webp");
    expect(result.contentType).toBe("image/webp");

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(32);
  });

  it("GIF 原样保留", async () => {
    const gif = await sharp({
      create: { width: 4, height: 4, channels: 3, background: "#0f0" },
    })
      .gif()
      .toBuffer();

    const result = await optimizeImage(gif, "gif");
    expect(result.ext).toBe("gif");
    expect(result.contentType).toBe("image/gif");
    expect(result.buffer).toBe(gif);
  });
});
