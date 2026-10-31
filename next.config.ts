import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  /**
   * dev 下允许访问 HMR 资源的来源。
   *
   * Next 16 默认拦截跨源 dev 资源：用 127.0.0.1:3000 打开页面时，HMR 的
   * WebSocket 会被判为跨源并拦掉（控制台只有一行 Blocked cross-origin request），
   * 表现是整站不水合、交互全失效、页面停在 SSR 骨架——很容易误判成组件 bug。
   * localhost 与局域网 IP 都要列上。
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.2.158"],
  /**
   * dev 与 build 的 Turbopack 缓存必须分开。
   *
   * 二者共用 .next 时，dev 会往里堆几百 MB 持久化缓存（实测 254MB / 530 文件），
   * build 再加 218MB blob；之后每次构建都要恢复并重写这堆东西，
   * Windows 上还要过一遍 Defender —— 实测整条构建 300 秒，而真正编译只有 5 秒。
   * 清空 .next 后同样一次构建只要 13 秒。
   *
   * 只给 dev 换目录、build 保持 .next：`output: "export"` 的产物目录跟着 distDir
   * 走，build 的 distDir 一改，out/ 就不再更新（部署会静默过期）。dev 不产出
   * out/，所以换它是安全的。
   */
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  /**
   * 构建期不再跑 tsc。
   *
   * 类型检查没有被放弃：`pnpm typecheck` / `pnpm verify` 会单独跑（约 8 秒），
   * 而 Next 内置那一步在 11 个页面 worker 并行时实测能拖到 250 秒，
   * 把发布构建卡在最后。构建只负责构建，类型错误交给 verify 拦。
   */
  typescript: { ignoreBuildErrors: true },
  // 刻意不启用 experimental.globalNotFound：
  // 该模式下绕过 root layout 直接返回 404，导致 notFound() 落到 Next 内置的
  // __next_error__ 空壳（实测 /tags/<未分页标签>/2/ 会变成无样式错误页）。
  // 改用 app/not-found.tsx，它在 root layout 内渲染，自动继承样式与主题。
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: ["remark-gfm", "remark-frontmatter"],
    rehypePlugins: [
      // 给没有语言标记的围栏（Notion 导出的裸围栏、```plain text）猜一个语言。
      // 必须排在 shiki 之前：颜色要在着色时一次定下来。
      path.join(process.cwd(), "src/lib/rehype-code-detect.ts"),
      // 构建期语法高亮。实现在 src/lib/rehype-shiki.ts（本地文件 + 绝对路径，
      // 因为 @next/mdx 对 ESM-only 包的字符串插件名会静默失效）。
      path.join(process.cwd(), "src/lib/rehype-shiki.ts"),
      // 必须紧跟在 shiki 之后：shiki 把语言写成数组型 class，MDX 转 JSX 时会
      // 整个丢掉，导致所有代码块的标签都变成 text。这个插件把它改写回 className。
      path.join(process.cwd(), "src/lib/rehype-code-lang.ts"),
      // 为标题注入锚点 id：文章内 #小节 深链、以及从搜索结果跳到某个小节都靠它。
      // 必须以「绝对路径字符串」引用：@next/mdx 把 options 序列化后交给
      // mdx-js-loader，直接传函数会报 "does not have serializable options"；
      // 相对路径则会被 Turbopack 相对 node_modules 解析而找不到。
      path.join(process.cwd(), "src/lib/rehype-heading-ids.ts"),
    ],
  },
});

export default withMDX(nextConfig);