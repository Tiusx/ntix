import { createHash } from "node:crypto";

/**
 * Memos 内容指纹。
 *
 * Memos 实例重建（换库、重装、迁移）会把所有 memo 的 uid 重新生成，
 * 同步脚本按 uid 比对时，一整批文件会同时被判为「已下架」——内容却一字未变。
 * 用「写作时间 + 正文」算指纹，就能把「uid 变了」和「内容真的没了」区分开：
 * 前者指纹仍能在新数据里找到，后者找不到。
 *
 * 归一化两件事，否则同一段内容会算出不同指纹：
 * - CRLF → LF（仓库在 Windows 上检出，正文可能是 \r\n）
 * - 首尾空白（frontmatter 与正文之间的空行、正文末尾的换行）
 */
export function contentFingerprint(date: string, content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  return createHash("sha1").update(`${date.trim()}\u0000${normalized}`).digest("hex");
}
