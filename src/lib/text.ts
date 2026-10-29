/**
 * 行内 Markdown → 纯文本。
 *
 * 用在「只能是纯文本」的位置：meta description、og:description、列表摘要、
 * 搜索片段。这些地方此前直接吃 frontmatter 的 summary，于是 Notion 里带来的
 * `**加粗**` 会原样出现在搜索结果和分享卡片上。
 *
 * 只处理行内语法，不处理段落/列表——传进来的应该是一行摘要。
 */
export function stripInlineMarkdown(input: string): string {
  return input
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片不产生文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接取锚文本
    .replace(/`([^`]*)`/g, "$1") // 行内代码取内容
    .replace(/<[^>]+>/g, "") // 内联 HTML 标签
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 粗体
    .replace(/(\*|_)(.*?)\1/g, "$2") // 斜体
    .replace(/~~(.*?)~~/g, "$1") // 删除线
    .replace(/\s+/g, " ")
    .trim();
}
