import sharp, { Sharp } from "sharp";
import decodeHeic from "heic-decode";

export interface OptimizedImage {
  /** 优化/压缩后的图片字节 */
  buffer: Buffer;
  /** 输出格式（默认 webp；GIF/SVG/AVIF 保留原格式） */
  ext: string;
  /** MIME 类型 */
  contentType: string;
}

/** 可转 WebP 的位图格式 */
const CONVERTIBLE_WEBP = new Set(["jpg", "jpeg", "png", "webp", "bmp"]);

/** 保留原样、不转码的格式 */
const KEEP_AS_IS = new Set(["gif", "svg", "avif"]);

/**
 * HEIC/HEIF 的 major brand（位于 ftyp box 的第 8~12 字节）。
 * 参考 https://github.com/strukturag/libheif/issues/83
 */
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/** 编码参数。 */
export interface ImageEncodeOptions {
  /** 长边上限；0 表示不缩放，保留原始尺寸（小图永远不放大） */
  maxWidth: number;
  /** 有损 WebP 质量 1-100；lossless 为 true 时忽略 */
  quality: number;
  /** WebP 无损编码：体积约等于原图 2~3 倍，换来像素级无损 */
  lossless: boolean;
}

const DEFAULT_IMAGE_OPTIONS: ImageEncodeOptions = {
  maxWidth: 2560,
  quality: 82,
  lossless: false,
};

/** 解析正整数环境变量，非法值回退默认值（不让拼写错误悄悄关掉缩放）。 */
function envInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return Math.round(n);
}

/** 解析布尔环境变量：1/true/yes/on 为真，其余为假。 */
function envBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/**
 * 读取图片编码参数。
 *
 * 刻意在调用时读取 process.env，而不是模块顶层求值：
 * 各脚本在 main() 里才 loadEnv()，顶层求值会让 .env.local 里的配置全部失效。
 */
export function getImageOptions(): ImageEncodeOptions {
  return {
    maxWidth: envInt(process.env.R2_IMAGE_MAX_WIDTH, DEFAULT_IMAGE_OPTIONS.maxWidth, 0, 20000),
    quality: envInt(process.env.R2_IMAGE_QUALITY, DEFAULT_IMAGE_OPTIONS.quality, 1, 100),
    lossless: envBool(process.env.R2_IMAGE_LOSSLESS, DEFAULT_IMAGE_OPTIONS.lossless),
  };
}

/** sharp 的 WebP 编码参数（从方法签名推导，避开命名空间引用问题）。 */
type WebpOptions = NonNullable<Parameters<Sharp["webp"]>[0]>;

/** 构造 sharp 的 WebP 编码参数；无损时 quality 无意义，交由编码器忽略。 */
function webpOptions(options: ImageEncodeOptions): WebpOptions {
  return options.lossless
    ? { lossless: true }
    : { quality: options.quality, smartSubsample: true };
}

/**
 * 按魔数判断是否为 HEIC/HEIF。
 *
 * 不看扩展名：Notion 托管的 file URL 后缀常常不可靠（甚至是 `.jpg`），
 * 而 iPhone 直传的图一律是 HEIC 容器。
 */
export function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer
    .toString("ascii", 8, 12)
    .replace(/\0/g, " ")
    .trim()
    .toLowerCase();
  return HEIC_BRANDS.has(brand);
}

/**
 * 按配置等比缩放；maxWidth <= 0 表示保留原始尺寸（永远不放大）。
 */
function applyResize(pipeline: Sharp, options: ImageEncodeOptions): Sharp {
  if (options.maxWidth <= 0) return pipeline;
  return pipeline.resize({
    width: options.maxWidth,
    height: options.maxWidth,
    fit: "inside",
    withoutEnlargement: true,
  });
}

/**
 * HEIC → WebP。
 *
 * sharp 的预编译 libvips 只带 AVIF 解码（`heif.input.fileSuffix` 仅 `[".avif"]`），
 * HEVC 编码的 HEIC 会直接抛 `unsupported image format`，所以必须先用
 * libheif-js（WASM）解出像素，再交给 sharp 编码。
 *
 * 旋转：libheif 的 `display()` 已经应用了容器内的 irot/imir 变换，
 * 输出即正向像素，因此这里不再调用 `.rotate()`（raw 输入也没有 EXIF 可读）。
 */
async function heicToWebp(buffer: Buffer, options: ImageEncodeOptions): Promise<OptimizedImage> {
  const { width, height, data } = await decodeHeic({ buffer });

  // Uint8ClampedArray → Buffer，注意 byteOffset 可能非 0（不要直接 data.buffer）
  const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  const pipeline = sharp(raw, { raw: { width, height, channels: 4 } });
  const webpBuffer = await applyResize(pipeline, options)
    .webp(webpOptions(options))
    .toBuffer();

  return { buffer: webpBuffer, ext: "webp", contentType: "image/webp" };
}

/**
 * 转码图片并剥离元信息（EXIF/GPS/ICC）：
 * - HEIC/HEIF（按魔数识别）→ 先 WASM 解码，再统一转 WebP
 * - JPEG/PNG/WebP/BMP 统一转 WebP（默认有损 q95 + smartSubsample，可切无损）
 * - GIF/SVG/AVIF 原样保留（避免破坏动画/矢量/高效编码）
 * - 超过 R2_IMAGE_MAX_WIDTH 的等比例缩小，小于的不放大；设 0 则保留原尺寸
 *
 * 参数全部走环境变量，见 .env.example。
 */
export async function optimizeImage(buffer: Buffer, ext: string): Promise<OptimizedImage> {
  const normalizedExt = ext.toLowerCase();
  const options = getImageOptions();

  // 魔数优先：扩展名会说谎，字节不会
  if (isHeic(buffer)) {
    return heicToWebp(buffer, options);
  }

  if (KEEP_AS_IS.has(normalizedExt)) {
    return { buffer, ext: normalizedExt, contentType: contentTypeOf(normalizedExt) };
  }

  if (CONVERTIBLE_WEBP.has(normalizedExt)) {
    const pipeline = sharp(buffer, { animated: false }).rotate(); // 根据 EXIF orientation 物理摆正
    const webpBuffer = await applyResize(pipeline, options)
      .webp(webpOptions(options))
      .toBuffer();

    return { buffer: webpBuffer, ext: "webp", contentType: "image/webp" };
  }

  // 无法识别的格式：原样保留
  return { buffer, ext: normalizedExt || "jpg", contentType: contentTypeOf(normalizedExt || "jpg") };
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

function contentTypeOf(ext: string): string {
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}
