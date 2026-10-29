/**
 * rehype 插件：把代码块的语言规范化成可用的 `className` 与 `data-language`。
 *
 * 为什么需要它：
 * @shikijs/rehype 的 `addLanguageClass` 是通过 transformer 的 `code(node)` 钩子
 * 调用 `this.addClassToHast()`，写进去的是 `properties.class = ["language-nginx"]`
 * ——一个**数组**，而且键名是 `class` 而不是 `className`。hast 里数组型 `class`
 * 只有在走 `className` 这条正规属性时才会被序列化成字符串；MDX 编译成 JSX 时
 * 直接把这个属性丢掉了。于是：
 *
 *   <code class="language-nginx">  →  <code>
 *
 * 上游读不到语言，所有代码块的标签都退化成兜底的 `text`。
 *
 * 这里在 shiki 之后跑一遍，统一成 `className: ["language-x"]`（MDX 会拼成
 * 字符串），并额外在 `<pre>` 上留一个 `data-language`，供 CSS 与客户端兜底读取。
 *
 * 与 rehype-heading-ids 同样的约束：由 next.config.ts 以绝对路径字符串引入，
 * 因此本模块零外部依赖，也不做无扩展名的相对导入。
 */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const LANGUAGE_PREFIX = /^language-(.+)$/;

/** hast 的 class 可能是字符串、数组、或两者嵌套，统一摊平成字符串数组。 */
function classList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(classList);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function readLang(properties: Record<string, unknown>): string {
  for (const className of [...classList(properties.className), ...classList(properties.class)]) {
    const matched = LANGUAGE_PREFIX.exec(className);
    if (matched) return matched[1].toLowerCase();
  }
  const attr = properties["data-language"];
  return typeof attr === "string" ? attr.toLowerCase() : "";
}

function normalize(pre: HastNode): void {
  const code = (pre.children ?? []).find(
    (child) => child.type === "element" && child.tagName === "code",
  );
  if (!code) return;

  const properties = (code.properties ??= {});
  const lang = readLang(properties) || readLang(pre.properties ?? {});

  // 删掉 shiki 写的数组型 class，改写成 MDX 认得的 className
  delete properties.class;
  if (lang) {
    properties.className = [`language-${lang}`];
    (pre.properties ??= {})["data-language"] = lang;
  } else {
    delete properties.className;
  }
}

function walk(node: HastNode): void {
  if (node.type === "element" && node.tagName === "pre") normalize(node);
  for (const child of node.children ?? []) walk(child);
}

export function rehypeCodeLang() {
  return (tree: HastNode): void => {
    walk(tree);
  };
}

export default rehypeCodeLang;
