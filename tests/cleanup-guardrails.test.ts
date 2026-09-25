import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupOrphanedFiles, sanitizeFileName, listManagedSlugs } from "@scripts/notion/utils";
import type { FetchResult } from "@scripts/notion/types";

/**
 * cleanupOrphanedFiles 的安全护栏。
 *
 * 这些用例是数据丢失风险的回归防线：Notion 查询一旦因配置错误 / 权限变更
 * 返回空结果，publishedIds 即为空，若无护栏会清空整个 content 目录，
 * 且 CI 会把删除自动提交。
 */
describe("cleanupOrphanedFiles 安全护栏", () => {
  let dir: string;

  const result = (): FetchResult => ({ updated: 0, skipped: 0, errors: 0, deleted: 0 });

  const makeDir = (files: string[]): string => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "ntix-cleanup-"));
    for (const f of files) fs.writeFileSync(path.join(d, f), "x");
    return d;
  };

  beforeEach(() => {
    dir = makeDir(["a.md", "b.md", "c.md", "_placeholder.md"]);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("published 为空时抛错，且一个文件都不能删", () => {
    const res = result();
    expect(() => cleanupOrphanedFiles(dir, new Set(), res)).toThrow(/Refusing to clean/);
    expect(() => cleanupOrphanedFiles(dir, new Set(), res)).toThrow(/0 published entries/);
    expect(fs.readdirSync(dir).sort()).toEqual(["_placeholder.md", "a.md", "b.md", "c.md"]);
    expect(res.deleted).toBe(0);
  });

  it("published 为空时抛错（空 Set 之外的空 published 也要挡住）", () => {
    const res = result();
    expect(() => cleanupOrphanedFiles(dir, new Set<string>(), res)).toThrow();
    expect(fs.readdirSync(dir)).toHaveLength(4);
  });

  it("待删比例超过阈值时抛错且不删", () => {
    const res = result();
    // 7 个文件里 5 个成孤儿 ≈ 71% > 50%
    const d = makeDir(["k1.md", "k2.md", "g1.md", "g2.md", "g3.md", "g4.md", "g5.md"]);
    expect(() => cleanupOrphanedFiles(d, new Set(["k1", "k2"]), res)).toThrow(
      /safety threshold/,
    );
    expect(fs.readdirSync(d)).toHaveLength(7);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("force 可越过比例阈值", () => {
    const res = result();
    const d = makeDir(["k1.md", "k2.md", "g1.md", "g2.md", "g3.md", "g4.md", "g5.md"]);
    cleanupOrphanedFiles(d, new Set(["k1", "k2"]), res, { force: true });
    expect(fs.readdirSync(d).sort()).toEqual(["k1.md", "k2.md"]);
    expect(res.deleted).toBe(5);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("dryRun 打印清单但不删除", () => {
    const res = result();
    const d = makeDir(["k1.md", "k2.md", "k3.md", "g1.md", "g2.md"]);
    cleanupOrphanedFiles(d, new Set(["k1", "k2", "k3"]), res, { dryRun: true });
    expect(fs.readdirSync(d)).toHaveLength(5);
    expect(res.deleted).toBe(0);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("dryRun 不会绕过比例阈值（预览也必须校验）", () => {
    const res = result();
    const d = makeDir(["k1.md", "k2.md", "g1.md", "g2.md", "g3.md", "g4.md"]);
    expect(() => cleanupOrphanedFiles(d, new Set(["k1", "k2"]), res, { dryRun: true })).toThrow(
      /safety threshold/,
    );
    expect(fs.readdirSync(d)).toHaveLength(6);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("正常场景只删孤儿，且 _ 前缀文件受保护", () => {
    const res = result();
    const d = makeDir(["a.md", "b.md", "c.md", "d.md", "e.md", "orphan.md", "_placeholder.md"]);
    cleanupOrphanedFiles(d, new Set(["a", "b", "c", "d", "e"]), res);
    expect(fs.readdirSync(d).sort()).toEqual([
      "_placeholder.md",
      "a.md",
      "b.md",
      "c.md",
      "d.md",
      "e.md",
    ]);
    expect(res.deleted).toBe(1);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("无孤儿时不改动任何文件", () => {
    const res = result();
    cleanupOrphanedFiles(dir, new Set(["a", "b", "c"]), res);
    expect(fs.readdirSync(dir)).toHaveLength(4);
    expect(res.deleted).toBe(0);
  });

  it("目录不存在时计入 errors 而不抛错", () => {
    const res = result();
    const missing = path.join(os.tmpdir(), "ntix-does-not-exist-xyz");
    expect(() => cleanupOrphanedFiles(missing, new Set(["a"]), res)).not.toThrow();
    expect(res.errors).toBe(1);
  });
});

describe("sanitizeFileName", () => {
  it("替换文件系统非法字符", () => {
    expect(sanitizeFileName('a/b\\c?d%e*f:g|h"i<j>k')).toBe("a-b-c-d-e-f-g-h-i-j-k");
  });

  it("空白折叠为单个连字符", () => {
    expect(sanitizeFileName("hello   world")).toBe("hello-world");
  });

  it("去掉首尾的连字符与点", () => {
    expect(sanitizeFileName("---abc---")).toBe("abc");
    expect(sanitizeFileName("...abc...")).toBe("abc");
  });

  it("空串回退为 untitled", () => {
    expect(sanitizeFileName("")).toBe("untitled");
    expect(sanitizeFileName("///")).toBe("untitled");
  });

  it("保留非 ASCII（中文 slug 依赖此行为，改动会破坏线上 URL）", () => {
    expect(sanitizeFileName("图床部署教程")).toBe("图床部署教程");
  });
});

describe("listManagedSlugs", () => {
  it("跳过 _ 前缀文件与非 .md 文件，并去掉扩展名", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "ntix-slugs-"));
    fs.writeFileSync(path.join(d, "a.md"), "x");
    fs.writeFileSync(path.join(d, "_placeholder.md"), "x");
    fs.writeFileSync(path.join(d, "notes.txt"), "x");
    expect(listManagedSlugs(d)).toEqual(["a"]);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("目录不存在时返回空数组", () => {
    expect(listManagedSlugs(path.join(os.tmpdir(), "ntix-nope-abc"))).toEqual([]);
  });
});
