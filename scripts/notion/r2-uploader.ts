import { createHash } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { optimizeImage } from "./image-optimizer";
import { loadEnv } from "./utils";

/**
 * Cloudflare R2 图片上传（基于 S3 兼容 API）。
 * 桶与公开域名不敏感，走环境变量（可被 .env.local 覆盖），默认值为本项目图床：
 *   桶：cf-imgbed，公开域名：https://r2.tius.cn
 * key 采用内容寻址：{:label}/{pageId}/{sha1(bytes)[:16]}.{ext}，天然幂等（HEAD 跳过）。
 */

loadEnv();

/** R2 桶名（不敏感，可被 R2_BUCKET 覆盖）。 */
const R2_BUCKET = process.env.R2_BUCKET || "cf-imgbed";
/** 绑定到 R2 桶的自定义域名（图片公开访问域名）。 */
const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || "https://r2.tius.cn").replace(/\/$/, "");
/**
 * 已托管域名集合（R2 图床或既有图床，逗号分隔，可被 R2_HOSTED_DOMAINS 覆盖）。
 * 命中这些域名时视为"已在图床"，同步跳过、保持原样。默认包含 r2.tius.cn 与 rimg.tius.cn。
 */
const GENERIC_HOSTED = ["https://r2.tius.cn", "https://rimg.tius.cn"];
const HOSTED_DOMAINS = (process.env.R2_HOSTED_DOMAINS || GENERIC_HOSTED.join(","))
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => new URL(d.includes("://") ? d : `https://${d}`).host);
/** 图床自定义域名的 host 集合，用于 isR2Url 精确匹配（含上传用公开域名）。 */
const R2_HOST = new URL(R2_PUBLIC_DOMAIN).host;

export interface ImageUploadResult {
  /** 上传后的公开访问 URL */
  url: string;
  /** 存储到 R2 的对象 key */
  fileName: string;
  /** 文件大小（字节） */
  size: number;
}

/**
 * 从 URL 提取扩展名（不含点、小写）；无法识别时回退 'jpg'。
 */
export const extractExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").filter(Boolean).pop();
    if (base && base.includes(".")) {
      const ext = base.split(".").pop();
      if (ext && /^[a-z0-9]{1,8}$/i.test(ext)) return ext.toLowerCase();
    }
  } catch {
    // 非法 URL，无法解析扩展名
  }
  return "jpg";
};

/**
 * 组合图片在 R2 中的对象 key（内容寻址、幂等、按页分组）。
 * 格式：{label}/{pageId}/{sha1(bytes)[:16]}.{ext}
 */
export const composeNewImageKey = (
  label: string,
  pageId: string,
  buffer: Buffer,
  ext: string,
): string => {
  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 16);
  return `${label}/${pageId}/${hash}.${ext}`;
};

/**
 * 判断 URL 是否指向图床自定义域名（按 host 精确匹配）。
 * 命中 r2.tius.cn / rimg.tius.cn 或配置的 R2_HOSTED_DOMAINS 均视为已托管，跳过上传。
 */
export const isR2Url = (url: string): boolean => {
  try {
    return HOSTED_DOMAINS.includes(new URL(url).host) || new URL(url).host === R2_HOST;
  } catch {
    return false;
  }
};

/** 判断 S3/R2 错误是否为「对象不存在」（HEAD 幂等检查用）。 */
export const is404 = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e.name === "NoSuchKey" || e.name === "NotFound" || e.$metadata?.httpStatusCode === 404;
};

export class R2ImageUploader {
  private client: S3Client;
  private bucket: string;
  private publicDomain: string;
  private dryRun: boolean;

  constructor(options: { dryRun?: boolean } = {}) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 image uploader is not fully configured. Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
      );
    }

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = R2_BUCKET;
    this.publicDomain = R2_PUBLIC_DOMAIN;
    this.dryRun = options.dryRun ?? false;
  }

  /** R2 上传凭据是否已配置（未配置时图片转存静默跳过）。 */
  static configured(): boolean {
    return Boolean(
      process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY,
    );
  }

  /**
   * 下载外部图片并上传到 R2（内容寻址、幂等）。
   * 若 key 已存在则 HEAD 跳过，保证重复执行不产生重复对象。
   */
  async uploadExternal(url: string, label: string, pageId: string): Promise<ImageUploadResult> {
    console.log(`📥 Downloading image: ${url}`);

    const res = await fetch(url, {
      cache: "no-cache",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NotionImageUploader/1.0)",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
    }

    const rawBuffer = Buffer.from(await res.arrayBuffer());
    const rawExt = extractExtension(url);

    // 压缩 + 剥离元信息（统一转 WebP，GIF/SVG/AVIF 原样保留）
    const { buffer, ext, contentType } = await optimizeImage(rawBuffer, rawExt);
    const key = composeNewImageKey(label, pageId, buffer, ext);
    const publicUrl = `${this.publicDomain}/${key}`;

    // key 是内容寻址的，因此 dry-run 能在不上传的前提下算出最终 URL，
    // 预览结果与真实上传完全一致。
    if (this.dryRun) {
      console.log(`🔍 [dry-run] would upload to R2: ${key}`);
      console.log(`              → ${publicUrl}`);
      return { url: publicUrl, fileName: key, size: buffer.length };
    }

    const head = await this.headObject(key);
    if (head) {
      console.log(`✅ Already on R2, skip upload: ${key}`);
      return { url: publicUrl, fileName: key, size: head.size ?? 0 };
    }

    console.log(
      `📤 Uploading to R2: ${key} (${(rawBuffer.length / 1024).toFixed(2)}KB -> ${(buffer.length / 1024).toFixed(2)}KB)` +
        (buffer.length < rawBuffer.length
          ? `, saved ${((1 - buffer.length / rawBuffer.length) * 100).toFixed(1)}%`
          : ""),
    );
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return { url: publicUrl, fileName: key, size: buffer.length };
  }

  /** HEAD 探测对象是否存在；不存在（404）返回 null，其余错误向上抛出。 */
  private async headObject(key: string): Promise<{ size?: number } | null> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: res.ContentLength };
    } catch (error) {
      if (is404(error)) return null;
      throw error;
    }
  }
}

