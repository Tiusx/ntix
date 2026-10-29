/**
 * 解析图片 URL 里携带的尺寸元数据。
 *
 * 图床（rimg.tius.cn）会把元信息挂在 **fragment** 上：
 *   https://rimg.tius.cn/images/<hash>.png#blurhash=L99H2_of...&width=680&height=205
 * fragment 永远不会发给服务端，浏览器也完全忽略它，所以此前这些信息被白白丢掉：
 * 渲染出来是没有任何尺寸的 <img>，文章图片一张张撑开导致明显的 CLS。
 *
 * 这里把元数据取出来，让 <img> 能带上 width/height——浏览器据此在图片下载前
 * 就先占好位置。（blurhash 只做留存，真正解码成占位图需要额外的客户端库，
 * 收益不抵成本，暂不使用。）
 */
export interface ImageMeta {
  /** 去掉 fragment 后的真实地址 */
  src: string;
  width?: number;
  height?: number;
  blurhash?: string;
}

function positiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function parseImageMeta(raw: string): ImageMeta {
  const hashIndex = raw.indexOf("#");
  if (hashIndex === -1) return { src: raw };

  const src = raw.slice(0, hashIndex);
  const params = new URLSearchParams(raw.slice(hashIndex + 1));

  return {
    src,
    width: positiveInt(params.get("width")),
    height: positiveInt(params.get("height")),
    blurhash: params.get("blurhash") ?? undefined,
  };
}
