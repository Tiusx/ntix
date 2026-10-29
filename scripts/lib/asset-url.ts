/**
 * 把 Memos 等外部来源给出的资源链接规范化成「可长期公开访问」的 URL。
 *
 * 背景：Memos 的 S3/R2 存储后端返回的是**预签名链接**——
 *   https://<account>.r2.cloudflarestorage.com/cf-imgbed/assets/x.webp
 *     ?X-Amz-Algorithm=...&X-Amz-Date=...&X-Amz-Expires=432000&X-Amz-Signature=...
 * 有效期只有几天。本站是 `output: "export"` 的静态站，链接会被固化进 markdown
 * 快照，过期后所有图片集体 403；而且签名每次同步都会变，会让文件内容无谓地
 * 变化、触发无意义的重建与 IndexNow 推送。
 *
 * 因此同步时统一改写为绑定在桶上的自定义域名（R2_PUBLIC_DOMAIN），并丢弃
 * 全部签名参数。
 */

/** R2 的 S3 兼容端点：路径风格下第一段是桶名。 */
const R2_S3_HOST = /\.r2\.cloudflarestorage\.com$/i;

/** 本项目图床默认桶名（不敏感，可被 R2_BUCKET 覆盖）。 */
export const DEFAULT_BUCKET = "cf-imgbed";

/** 本项目图床默认公开域名（可被 R2_PUBLIC_DOMAIN 覆盖）。 */
export const DEFAULT_PUBLIC_DOMAIN = "https://r2.tius.cn";

/**
 * 绑定到 R2 桶的自定义域名（图片公开访问域名）。
 * 定义在此是因为图片同步（sync-memos）与上传器（r2-uploader）必须用同一个域名，
 * 否则前者写进 markdown 的链接会和后者上传后的实际地址不一致。
 */
export const r2PublicDomain = (): string =>
  (process.env.R2_PUBLIC_DOMAIN || DEFAULT_PUBLIC_DOMAIN).replace(/\/+$/, "");

/** R2 桶名。 */
export const r2Bucket = (): string => process.env.R2_BUCKET || DEFAULT_BUCKET;

export interface PublicAssetUrlOptions {
  /** 公开访问域名，如 https://r2.tius.cn */
  publicDomain: string;
  /** 桶名；仅用于从 S3 路径里剥掉第一段 */
  bucket: string;
}

/**
 * 将预签名 / S3 端点链接改写为公开域名链接。
 * 已经是公开域名时仅清理签名参数；其他域名原样返回（不擅自改写第三方链接）。
 */
export function toPublicAssetUrl(raw: string, options: PublicAssetUrlOptions): string {
  const domain = options.publicDomain.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  const isS3Endpoint = R2_S3_HOST.test(parsed.hostname);
  const isPublicHost = parsed.host === new URL(domain).host;
  if (!isS3Endpoint && !isPublicHost) return raw;

  let pathname = parsed.pathname;
  if (isS3Endpoint) {
    const segments = pathname.split("/").filter(Boolean);
    // 路径风格：/<bucket>/<key...>；不是该桶则保持原路径，避免误删真实 key
    if (segments[0] === options.bucket && segments.length > 1) {
      pathname = `/${segments.slice(1).join("/")}`;
    }
  }

  // 签名、时效、x-id 等查询参数一律丢弃
  return `${domain}${pathname}`;
}
