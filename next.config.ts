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
  },
});

export default withMDX(nextConfig);