import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  allowedDevOrigins: ["192.168.2.158"],
  // 刻意不启用 experimental.globalNotFound：
  // 该模式下绕过 root layout 直接返回 404，导致 notFound() 落到 Next 内置的
  // __next_error__ 空壳（实测 /tags/<未分页标签>/2/ 会变成无样式错误页）。
  // 改用 app/not-found.tsx，它在 root layout 内渲染，自动继承样式与主题。
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: ["remark-gfm", "remark-frontmatter"],
    // 为标题注入锚点 id，供文章页的文内目录跳转。
    // 必须以「绝对路径字符串」引用：@next/mdx 把 options 序列化后交给
    // mdx-js-loader，直接传函数会报 "does not have serializable options"；
    // 相对路径则会被 Turbopack 相对 node_modules 解析而找不到。
    rehypePlugins: [path.join(process.cwd(), "src/lib/rehype-heading-ids.ts")],
  },
});

export default withMDX(nextConfig);