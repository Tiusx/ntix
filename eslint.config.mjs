import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * Next.js 16 已移除 `next lint`，因此直接使用 ESLint CLI + flat config。
 * 参考 node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // 未使用变量一律报错，但允许 _ 前缀与 rest/解构豁免
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // 禁止残留 any；确需逃逸时用 unknown + 显式收窄
      "@typescript-eslint/no-explicit-any": "error",
      // 本项目 output:"export" + images.unoptimized，图片统一走 LightboxImage
      // （原生 <img> 以便点击放大与灯箱接管），next/image 在静态导出下无收益。
      "@next/next/no-img-element": "off",
      // 该规则针对 pages/_document.js；本项目是 App Router，
      // layout.tsx 里的 <link> 是全站生效的 CDN 样式，属于误报。
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: {
      // 同步脚本用 node:fs 同步 API，无需强制 no-console
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    "next-env.d.ts",
    "**/*.tsbuildinfo",
    // 临时验证脚本（用 node 直接跑，不参与 lint）
    "scripts/__verify*",
  ]),
]);
