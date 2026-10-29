import { describe, expect, it } from "vitest";
import { stripInlineMarkdown } from "@/lib/text";
import { getAllPosts } from "@/lib/posts";

/**
 * summary 会流进 meta description / og:description / 列表 / 搜索片段，
 * 这些位置不能出现 Markdown 字面量。
 */
describe("stripInlineMarkdown", () => {
  it("去掉加粗与斜体标记", () => {
    expect(stripInlineMarkdown("报错来自 **DevTools 自身**注入的 _内联_ 脚本")).toBe(
      "报错来自 DevTools 自身注入的 内联 脚本",
    );
  });

  it("行内代码保留内容、去掉反引号", () => {
    expect(stripInlineMarkdown("执行 `pnpm dev` 即可")).toBe("执行 pnpm dev 即可");
  });

  it("链接取锚文本，图片整条丢弃", () => {
    expect(stripInlineMarkdown("见 [文档](/docs) 与 ![图](a.png)")).toBe("见 文档 与");
  });

  it("去掉内联 HTML 标签", () => {
    expect(stripInlineMarkdown("第一行<br/>第二行")).toBe("第一行第二行");
  });

  it("折叠多余空白", () => {
    expect(stripInlineMarkdown("  a \n\n b  ")).toBe("a b");
  });

  it("真实文章的摘要里不再残留星号", () => {
    for (const post of getAllPosts()) {
      expect(post.meta.summary, `slug=${post.meta.slug}`).not.toMatch(/\*\*|`/);
    }
  });
});
