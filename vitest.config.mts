import { defineConfig } from "vitest/config";

/**
 * 单元测试配置。
 *
 * 注意（来自 Next 16 官方 Vitest 指南）：Vitest 不支持 async Server Components，
 * 因此这里只覆盖纯函数与同步组件；页面级行为靠 typecheck + next build 保证。
 */
export default defineConfig({
  // Vite 原生支持 tsconfig paths，复用 @/*、@content/*、@scripts/* 别名
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      include: ["src/lib/**", "scripts/lib/**", "scripts/notion/utils.ts"],
    },
  },
});
