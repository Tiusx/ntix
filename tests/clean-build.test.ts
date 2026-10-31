import { describe, expect, it } from "vitest";
import { isNextDevCommand, isStaleNextBuildCommand } from "@scripts/lib/process-match";

/**
 * 清理脚本的误杀护栏。
 *
 * 这些用例都来自真实命令行：pnpm 拉起 next build 的样子、dev worker 的
 * 命令行长什么样、脚本自己的命令行长什么样。判定一旦放宽，最先被杀的就是
 * 正在跑的 dev server——比「构建卡住」更难排查。
 */

const ROOT = String.raw`I:\WorkBuddy_Workspace\Blog\ntix`;

describe("isStaleNextBuildCommand", () => {
  it("识别 pnpm / 直接执行拉起的 next build", () => {
    expect(isStaleNextBuildCommand(`"node" ${ROOT}\\node_modules\\next\\dist\\bin\\next build`)).toBe(true);
    expect(isStaleNextBuildCommand(`node ${ROOT}\\node_modules\\.bin\\next.cmd build`)).toBe(true);
    expect(isStaleNextBuildCommand("next build")).toBe(true);
    // pnpm 实际拉起的形态：可执行文件路径带引号，next 后面紧跟的是引号
    expect(isStaleNextBuildCommand(`node "${ROOT}\\node_modules\\next\\dist\\bin\\next" build`)).toBe(true);
  });

  it("不碰 dev server", () => {
    expect(isStaleNextBuildCommand(`node ${ROOT}\\node_modules\\next\\dist\\bin\\next dev`)).toBe(false);
    expect(isStaleNextBuildCommand(`node "${ROOT}\\node_modules\\next\\dist\\bin\\next" dev`)).toBe(false);
    expect(isStaleNextBuildCommand("next dev --turbopack")).toBe(false);
  });

  it("不碰 turbopack dev worker（命令行里同时有 .next-dev 和 build/chunks）", () => {
    expect(
      isStaleNextBuildCommand(
        `"node" ${ROOT}\\.next-dev\\dev\\build\\chunks\\pool_entry-[turbopack-node]_[project]_[hash].js`,
      ),
    ).toBe(false);
  });

  it("不碰清理脚本自己与 pnpm 本体", () => {
    expect(
      isStaleNextBuildCommand(`node ${ROOT}\\node_modules\\tsx\\dist\\cli.mjs scripts/clean-build.ts`),
    ).toBe(false);
    expect(isStaleNextBuildCommand(`node ${ROOT}\\node_modules\\pnpm\\bin\\pnpm.cjs build:clean`)).toBe(false);
  });

  it("不匹配名字相近的目录", () => {
    expect(isStaleNextBuildCommand(`node ${ROOT}\\nextjs\\build.js`)).toBe(false);
  });

  it("空命令行直接判否", () => {
    expect(isStaleNextBuildCommand("")).toBe(false);
  });
});

describe("isNextDevCommand", () => {
  it("识别 dev server（clean 据此保留 .next-dev）", () => {
    expect(isNextDevCommand(`node ${ROOT}\\node_modules\\next\\dist\\bin\\next dev`)).toBe(true);
    expect(isNextDevCommand(`node "${ROOT}\\node_modules\\next\\dist\\bin\\next" dev`)).toBe(true);
    expect(isNextDevCommand("next dev --turbopack")).toBe(true);
  });

  it("不把 build 或 dev worker 认成 dev server", () => {
    expect(isNextDevCommand(`node ${ROOT}\\node_modules\\next\\dist\\bin\\next build`)).toBe(false);
    expect(
      isNextDevCommand(`"node" ${ROOT}\\.next-dev\\dev\\build\\chunks\\pool_entry-[turbopack-node].js`),
    ).toBe(false);
    expect(isNextDevCommand("")).toBe(false);
  });
});
