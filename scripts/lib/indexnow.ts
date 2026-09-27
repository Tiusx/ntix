/** IndexNow 的纯逻辑，供脚本与单测共用（脚本顶层会执行 main()，不可直接被测试 import）。 */

export interface IndexNowState {
  /** url -> 内容指纹 */
  [url: string]: string;
}

/**
 * 挑出新增或指纹变化的 URL，同时列出已不存在的条目。
 *
 * IndexNow 的语义是提交变更，因此未变更的 URL 不应重复提交：
 * 既浪费配额，也可能被限流。
 */
export function selectChanged(
  signatures: Map<string, string>,
  previous: IndexNowState,
): { changed: string[]; removed: string[] } {
  const changed: string[] = [];
  for (const [url, sig] of signatures) {
    if (previous[url] !== sig) changed.push(url);
  }
  const removed = Object.keys(previous).filter((u) => !signatures.has(u));
  return { changed, removed };
}
