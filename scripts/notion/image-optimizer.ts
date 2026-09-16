import sharp from "sharp";

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

/** 质量参数（可被 R2_IMAGE_QUALITY 覆盖，默认 82）。 */
const IMAGE_QUALITY =
  Number(process.env.R2_IMAGE_QUALITY || 82) ||
  82;
/** 最大边长（可被 R2_IMAGE_MAX_WIDTH 覆盖，默认 2560；小图不会放大）。 */
const IMAGE_MAX_WIDTH =
  Number(process.env.R2_IMAGE_MAX_WIDTH || 2560) ||
  2560;

/**
 * 压缩图片并剥离元信息（EXIF/GPS/ICC）：
 * - JPEG/PNG/WebP/BMP 统一转 WebP（激进优化）
 * - GIF/SVG/AVIF 原样保留（避免破坏动画/矢量/高效编码）
 * - 超过最大边长的等比例缩小，小于的不放大
 */
export async function optimizeImage(buffer: Buffer, ext: string): Promise<OptimizedImage> {
  const normalizedExt = ext.toLowerCase();

  if (KEEP_AS_IS.has(normalizedExt)) {
    return { buffer, ext: normalizedExt, contentType: contentTypeOf(normalizedExt) };
  }

  if (CONVERTIBLE_WEBP.has(normalizedExt)) {
    const webpBuffer = await sharp(buffer, { animated: false })
      .rotate() // 根据 EXIF orientation 物理摆正
      .resize({
        width: IMAGE_MAX_WIDTH,
        height: IMAGE_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_QUALITY })
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