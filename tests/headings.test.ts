import { describe, expect, it } from "vitest";
import { extractHeadings, TOC_MIN_ENTRIES } from "@/lib/headings";
import { getAllPosts, getPostBody } from "@/lib/posts";

/**
 * TOC 的 id 必须和 rehype-heading-ids 注入的正文 id 完全一致，
 * 否则目录点一下就跳空。这些用例锁住识别与 slug 规则。
 */
describe("extractHeadings", () => {
  it("提取 h2/h3 并生成与插件一致的 id", () => {
    const md = ["## 现象", "正文", "### 复现步骤", "正文", "## 根因"].join("\n");
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "现象", id: "现象" },
      { depth: 3, text: "复现步骤", id: "复现步骤" },
      { depth: 2, text: "根因", id: "根因" },
    ]);
  });

  it("围栏代码块里的 # 不算标题", () => {
    const md = ["## 真标题", "```bash", "## 这是注释不是标题", "```", "## 另一个"].join("\n");
    expect(extractHeadings(md).map((e) => e.id)).toEqual(["真标题", "另一个"]);
  });

  it("未闭合的代码块会吞掉其后全部内容", () => {
    const md = ["## 前", "```", "## 后"].join("\n");
    expect(extractHeadings(md)).toHaveLength(1);
  });

  it("重复标题按出现顺序去重", () => {
    const md = ["## 排查", "## 排查", "## 排查"].join("\n");
    expect(extractHeadings(md).map((e) => e.id)).toEqual(["排查", "排查-1", "排查-2"]);
  });

  it("h4 不进入目录，但必须占用去重序号", () => {
    const md = ["## 缓存", "#### 缓存", "## 缓存"].join("\n");
    expect(extractHeadings(md).map((e) => e.id)).toEqual(["缓存", "缓存-2"]);
  });

  it("清洗行内 Markdown：代码、链接、图片、粗体", () => {
    const md = "## 运行 `pnpm dev` 后看 ![图](a.png) [日志](/x) 的 **结果**";
    const [entry] = extractHeadings(md);
    expect(entry.text).toBe("运行 pnpm dev 后看  日志 的 结果");
    expect(entry.id).toBe("运行-pnpm-dev-后看-日志-的-结果");
  });

  it("引用块里的标题也算", () => {
    expect(extractHeadings("> ## 引用小标题")[0].id).toBe("引用小标题");
  });

  it("兼容 ATX 收尾井号", () => {
    expect(extractHeadings("## 结语 ##")[0].text).toBe("结语");
  });

  it("兼容 CRLF 换行（Notion 同步下来的文件就是这种）", () => {
    expect(extractHeadings("## 现象\r\n正文\r\n### 根因\r\n").map((e) => e.id)).toEqual([
      "现象",
      "根因",
    ]);
  });

  it("四级缩进的 # 是代码不是标题", () => {
    expect(extractHeadings("    ## 缩进代码")).toHaveLength(0);
  });
});

describe("真实文章的目录", () => {
  const posts = getAllPosts();

  it("长文章的 id 互不重复，且都以 # 可用字符组成", () => {
    for (const post of posts) {
      const ids = extractHeadings(getPostBody(post.slug)).map((e) => e.id);
      expect(new Set(ids).size, `slug=${post.slug}`).toBe(ids.length);
      for (const id of ids) {
        expect(id).not.toMatch(/[\s#?]/);
      }
    }
  });

  it("至少有一篇长文会展示目录", () => {
    const withToc = posts.filter(
      (post) => extractHeadings(getPostBody(post.slug)).length >= TOC_MIN_ENTRIES,
    );
    expect(withToc.length).toBeGreaterThan(0);
  });
});
