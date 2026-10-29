import { createSlugger } from "./rehype-heading-ids";

/**
 * 从文章 Markdown 源码里提取标题，生成文内目录（TOC）。
 *
 * 为什么扫源码而不是扫渲染后的 HTML：文章正文是构建期由 MDX 编译器渲染的，
 * 页面组件拿不到那棵 hast 树。因此这里复刻「行级」的标题识别，并复用
 * rehype-heading-ids 里同一份 createSlugger——两边只要共用 slug 逻辑，
 * 目录锚点就不会和正文 id 对不上。
 *
 * 识别规则按 CommonMark 收敛：
 * - 只在围栏代码块与缩进代码块之外识别（正文里的 `## 报错` 示例不算标题）
 * - 允许最多 3 个空格缩进，允许引用块前缀（> ## 小标题）
 * - 支持 ATX 的收尾 #（## 标题 ##）
 * - 保留全部 h1-h6 参与 slug 计数，最后只输出 h2/h3——即使某个 h4 被跳过，
 *   它占用的去重序号也必须一致，否则 h2 的 id 会和正文错位
 */
export interface TocEntry {
  depth: 2 | 3;
  text: string;
  id: string;
}

const ATX = /^(?:[ \t]*>[ \t]?)*[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;

/** 去掉标题文本里的行内 Markdown 标记，逼近渲染后的纯文本。 */
function toPlainHeadingText(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片不产生文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接取锚文本
    .replace(/`([^`]*)`/g, "$1") // 行内代码取内容
    .replace(/<[^>]+>/g, "") // 内联 HTML 标签
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 粗体
    .replace(/(\*|_)(.*?)\1/g, "$2") // 斜体
    .replace(/~~(.*?)~~/g, "$1") // 删除线
    .trim();
}

export function extractHeadings(markdown: string): TocEntry[] {
  const slug = createSlugger().slug;
  const entries: TocEntry[] = [];
  let fence: string | null = null;

  // 必须同时吃 CRLF：文章由 Notion 同步而来，文件是 Windows 换行，
  // 直接 split("\n") 会让每行尾多一个 \r，ATX 正则的 `$` 就匹配不上。
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;

    const match = ATX.exec(line);
    if (!match) continue;

    const depth = match[1].length;
    const text = toPlainHeadingText(match[2]);
    if (!text) continue;

    // 所有级别都要计数，保证与 rehype 插件走到的标题序列一致
    const id = slug(text);
    if (depth === 2 || depth === 3) {
      entries.push({ depth: depth as 2 | 3, text, id });
    }
  }

  return entries;
}

/** 目录是否值得显示：太短的文章套个目录反而碍事。 */
export const TOC_MIN_ENTRIES = 3;
