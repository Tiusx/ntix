import { createHash } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { optimizeImage } from "./image-optimizer";
import { isTransientHttpError, withRetry } from "../lib/retry";
import { r2Bucket, r2PublicDomain } from "../lib/asset-url";

/**
 * Cloudflare R2 图片上传（基于 S3 兼容 API）。
 * 桶与公开域名不敏感，走环境变量（可被 .env.local 覆盖），默认值为本项目图床：
 *   桶：cf-imgbed，公开域名：https://r2.tius.cn
 * key 采用内容寻址：{:label}/{pageId}/{sha1(bytes)[:16]}.{ext}，天然幂等（HEAD 跳过）。
 *
 * 注意：这里刻意不在模块顶层调用 loadEnv()，也不在顶层读取 process.env。
 * 此前 r2-uploader 顶层的 loadEnv() 是整个 Notion 管道的「承重」副作用——
 * fetch-posts / fetch-pages 在模块作用域构造 config 并读 process.env，
 * 之所以能读到值全靠 ES import 深度优先求值把 dotenv 提前执行了。
 * 调整任一 import 顺序都会让两个 fetcher 报「缺少环境变量」。
 * 现已改为由各脚本在 main() 中显式 loadEnv() 后再构造 config。
 */

/**
 * 已托管域名集合（R2 图床或既有图床，逗号分隔，可被 R2_HOSTED_DOMAINS 覆盖）。
 * 命中这些域名时视为「已在图床」，同步跳过、保持原样。默认包含 r2.tius.cn 与 rimg.tius.cn。
 */
const GENERIC_HOSTED = ["https://r2.tius.cn", "https://rimg.tius.cn"];

const hostedDomains = (): string[] =>
  (process.env.R2_HOSTED_DOMAINS || GENERIC_HOSTED.join(","))
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => new URL(d.includes("://") ? d : `https://${d}`).host);

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
 * 浏览器无法直接渲染、必须重新转码的历史遗留格式。
 *
 * 旧版管线没有 HEIC 解码能力，会把原始 HEIC 以 `application/octet-stream`
 * 直传图床，结果是文章里的裂图。这些对象已经「托管在 R2」，光靠 isR2Url
 * 判断会被当成已处理而永久跳过，因此需要单独识别并重跑转码。
 */
const LEGACY_UNRENDERABLE_EXT = new Set(["heic", "heif"]);

/**
 * 判断是否为「已托管但格式不可渲染」的资源，命中即需重新下载 → 转码 → 换新 key 上传。
 */
export const needsRepair = (url: string): boolean =>
  LEGACY_UNRENDERABLE_EXT.has(extractExtension(url));

/**
 * 判断 URL 是否指向图床自定义域名（按 host 精确匹配）。
 * 命中 r2.tius.cn / rimg.tius.cn 或配置的 R2_HOSTED_DOMAINS 均视为已托管，跳过上传。
 */
export const isR2Url = (url: string): boolean => {
  try {
    const host = new URL(url).host;
    return hostedDomains().includes(host) || host === new URL(r2PublicDomain()).host;
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

/**
 * 下载失败是否值得重试：HTTP 瞬时错误（429/408/5xx）+ 底层网络错误。
 *
 * `fetch failed` / `terminated` / `TimeoutError` 这类错误没有 `status`，
 * 用默认的 isTransientHttpError 会被判成「不可重试」直接抛出——
 * 4MB 的 HEIC 原图在慢链路上抖一下整张图就废了，必须重试。
 */
const isRetryableDownloadError = (error: unknown): boolean => {
  if (isTransientHttpError(error)) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== "number";
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
    this.bucket = r2Bucket();
    this.publicDomain = r2PublicDomain();
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
  async uploadExternal(
    url: string,
    label: string,
    pageId: string,
    options: { timeoutMs?: number } = {},
  ): Promise<ImageUploadResult> {
    console.log(`📥 Downloading image: ${url}`);

    const res = await withRetry(
      () =>
        fetch(url, {
          cache: "no-cache",
          // 大图（5MB 级）在慢链路上单次下载就要 30s+，60s 的默认值会把它们判死；
          // 调用方可以按需放宽，文章配图仍走默认
          signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NotionImageUploader/1.0)",
          },
        }),
      { attempts: 3, isRetryable: isRetryableDownloadError, label: `download image ${url.slice(0, 80)}` },
    );

    if (!res.ok) {
      const err = new Error(`Failed to download image: ${res.status} ${res.statusText}`) as Error & {
        status: number;
      };
      err.status = res.status;
      throw err;
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

