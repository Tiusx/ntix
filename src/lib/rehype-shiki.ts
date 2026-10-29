import rehypeShiki, { type RehypeShikiOptions } from "@shikijs/rehype";

/**
 * 语法高亮的 rehype 插件入口。
 *
 * 为什么不直接在 next.config.ts 里写 `["@shikijs/rehype", {...}]`：
 * @next/mdx 把插件名当模块标识符去解析，对 ESM-only 的包会静默失效
 * （构建能过，产物里一个高亮 span 都没有）。改成本地文件 + 绝对路径引用，
 * 与 rehype-heading-ids 走同一条已被验证的加载路径。
 */

/**
 * 只注册文章实际用到的语言。
 * @shikijs/rehype 默认把 bundledLanguages 全量塞给 highlighter（200+ 种），
 * 构建期要逐个动态 import，白白拖慢构建；这里显式收敛。
 * 未列出的语言（Notion 的 ```plain text、vb 等）由 fallbackLanguage 兜底。
 */
const LANGS = [
  "shell",
  "bash",
  "nginx",
  "php",
  "typescript",
  "javascript",
  "json",
  "sql",
  "markdown",
  "dockerfile",
  "yaml",
] as const;

const OPTIONS: RehypeShikiOptions = {
  themes: { light: "github-light", dark: "github-dark" },
  // 只输出 --shiki-light / --shiki-dark 两个变量，颜色交给 globals.css
  // 按 data-theme 选，切主题不需要重新高亮。
  defaultColor: false,
  langs: [...LANGS],
  fallbackLanguage: "text",
  // 让 shiki 把语言写回 <pre>：CodeBlock 的标签靠它显示，否则只能显示 "text"
  addLanguageClass: true,
};

/**
 * 必须带着 `this`（Processor）转交给 shiki：它的插件内部会用
 * `rehypeShikiFromHighlighter.call(this, ...)`，脱离 this 直接调用会失效。
 */
export default function rehypeShikiPlugin(this: unknown) {
  return rehypeShiki.call(this as never, OPTIONS);
}
