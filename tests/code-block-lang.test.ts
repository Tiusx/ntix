import { describe, expect, it } from "vitest";
import { rehypeCodeLang } from "../src/lib/rehype-code-lang";
import { detectLanguage } from "../src/lib/rehype-code-detect";

interface Element {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Node[];
}
type Node = Element | { type: "text"; value: string };

function pre(codeProps: Record<string, unknown>): Element {
  return {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      { type: "element", tagName: "code", properties: codeProps, children: [] },
    ],
  };
}

function run(node: Element): Element {
  const tree = { type: "element", tagName: "root", properties: {}, children: [node] };
  rehypeCodeLang()(tree as never);
  return node;
}

describe("rehypeCodeLang", () => {
  it("把 shiki 写的数组型 class 改写成 MDX 认得的 className", () => {
    const node = run(pre({ class: ["language-nginx"] }));
    const code = node.children[0] as Element;
    expect(code.properties.className).toEqual(["language-nginx"]);
    expect(code.properties.class).toBeUndefined();
  });

  it("同时在 pre 上留下 data-language", () => {
    const node = run(pre({ class: "language-bash" }));
    expect(node.properties["data-language"]).toBe("bash");
  });

  it("没有语言时不写 className，避免渲染出空的 class 属性", () => {
    const node = run(pre({}));
    const code = node.children[0] as Element;
    expect(code.properties.className).toBeUndefined();
    expect(node.properties["data-language"]).toBeUndefined();
  });

  it("多个 class 里只取 language- 开头那个", () => {
    const node = run(pre({ class: ["shiki", "language-php"] }));
    const code = node.children[0] as Element;
    expect(code.properties.className).toEqual(["language-php"]);
  });
});

describe("detectLanguage", () => {
  it("识别 nginx 片段", () => {
    expect(detectLanguage('location ~ "index\\.sh"$ {\n    return 403;\n}')).toBe("nginx");
  });

  it("识别 shell 命令块", () => {
    expect(detectLanguage("systemctl restart nginx\njournalctl -u nginx -n 50")).toBe("bash");
  });

  it("识别单行命令", () => {
    expect(detectLanguage("nginx -t")).toBe("bash");
  });

  it("识别 JSON", () => {
    expect(detectLanguage('{ "a": 1 }')).toBe("json");
  });

  it("识别 SQL 与 YAML", () => {
    expect(detectLanguage("SELECT id FROM users WHERE id = 1;")).toBe("sql");
    expect(detectLanguage("server:\n  port: 8080\n  host: 0.0.0.0")).toBe("yaml");
  });

  it("日志与中文说明留空，不硬猜", () => {
    expect(detectLanguage("2026-10-30 06:12:33 [error] 1234#0: *5 connect() failed")).toBe("");
    expect(detectLanguage("这里是一段说明文字，没有代码特征。")).toBe("");
  });
});
