import { describe, expect, it } from "vitest";
import {
  getCheckboxProperty,
  getDateProperty,
  getFilesProperty,
  getMultiSelectProperty,
  getSelectProperty,
  getTextProperty,
  requireProperty,
} from "@scripts/notion/utils";

/**
 * Notion 属性 getter。
 *
 * 重点：这些函数过去用 `any` + `prop?.x ?? ""`，Notion 属性一改名就静默返回空串，
 * 表现为「同步成功但 frontmatter 全空」。requireProperty 现在会让缺失立刻抛错。
 */
describe("requireProperty", () => {
  const props = { title: { type: "title" }, slug: { type: "rich_text" } };

  it("属性存在时返回该属性", () => {
    expect(requireProperty(props, "slug", "post")).toBe(props.slug);
  });

  it("属性缺失时抛错并列出可用属性", () => {
    expect(() => requireProperty(props, "category", "post")).toThrow(/missing the "category"/);
    expect(() => requireProperty(props, "category", "post")).toThrow(/title, slug/);
  });

  it("属性值为 null 也视为缺失", () => {
    expect(() => requireProperty({ a: null }, "a", "post")).toThrow(/missing/);
  });
});

describe("getTextProperty", () => {
  it("拼接 title 类型", () => {
    expect(getTextProperty({ type: "title", title: [{ plain_text: "你好" }, { plain_text: "世界" }] })).toBe("你好世界");
  });

  it("拼接 rich_text 类型", () => {
    expect(getTextProperty({ type: "rich_text", rich_text: [{ plain_text: "a" }, { plain_text: "b" }] })).toBe("ab");
  });

  it("其他类型与空值返回空串", () => {
    expect(getTextProperty({ type: "checkbox", checkbox: true })).toBe("");
    expect(getTextProperty(undefined)).toBe("");
    expect(getTextProperty({ type: "title" })).toBe("");
  });
});

describe("getSelectProperty", () => {
  it("返回选项名", () => {
    expect(getSelectProperty({ type: "select", select: { name: "开发" } })).toBe("开发");
  });

  it("select 为 null 时返回空串", () => {
    expect(getSelectProperty({ type: "select", select: null })).toBe("");
    expect(getSelectProperty(undefined)).toBe("");
  });
});

describe("getMultiSelectProperty", () => {
  it("返回全部选项名", () => {
    expect(
      getMultiSelectProperty({ type: "multi_select", multi_select: [{ name: "a" }, { name: "b" }] }),
    ).toEqual(["a", "b"]);
  });

  it("缺失时返回空数组", () => {
    expect(getMultiSelectProperty(undefined)).toEqual([]);
    expect(getMultiSelectProperty({ type: "multi_select" })).toEqual([]);
  });

  it("过滤掉没有 name 的项", () => {
    expect(getMultiSelectProperty({ multi_select: [{ name: "a" }, {}] })).toEqual(["a"]);
  });
});

describe("getDateProperty", () => {
  it("返回起始日期", () => {
    expect(getDateProperty({ type: "date", date: { start: "2026-09-12" } })).toBe("2026-09-12");
  });

  it("date 为 null 时返回空串", () => {
    expect(getDateProperty({ type: "date", date: null })).toBe("");
    expect(getDateProperty(undefined)).toBe("");
  });
});

describe("getCheckboxProperty", () => {
  it("返回布尔值", () => {
    expect(getCheckboxProperty({ type: "checkbox", checkbox: true })).toBe(true);
    expect(getCheckboxProperty({ type: "checkbox", checkbox: false })).toBe(false);
  });

  it("缺失时为 false", () => {
    expect(getCheckboxProperty(undefined)).toBe(false);
  });
});

describe("getFilesProperty", () => {
  it("返回第一个 file 类型文件的 url", () => {
    expect(
      getFilesProperty({ type: "files", files: [{ type: "file", file: { url: "https://a/1.png" } }] }),
    ).toBe("https://a/1.png");
  });

  it("返回第一个 external 类型文件的 url", () => {
    expect(
      getFilesProperty({
        type: "files",
        files: [{ type: "external", external: { url: "https://b/2.png" } }],
      }),
    ).toBe("https://b/2.png");
  });

  it("空数组或缺失时返回空串", () => {
    expect(getFilesProperty({ type: "files", files: [] })).toBe("");
    expect(getFilesProperty(undefined)).toBe("");
  });

  it("无法识别的类型返回空串", () => {
    expect(getFilesProperty({ type: "files", files: [{ type: "weird" }] })).toBe("");
  });
});
