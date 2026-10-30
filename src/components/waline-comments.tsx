"use client";

import { useEffect, useRef } from "react";
import { init } from "@waline/client";
import { DARK_THEME } from "@/lib/theme";
import { WALINE_SERVER_URL } from "@/lib/comments";
// 样式跟着组件一起走：本文件被 Comments 动态引入，只有真正启用 Waline 时
// 才会下载这份 CSS，Giscus 用户不会为它买单。
import "@waline/client/style";

/**
 * Waline 评论。
 *
 * 与 Giscus 的差别：Waline 是自建服务端，需要 `NEXT_PUBLIC_WALINE_SERVER_URL`
 * 指向一个已部署的实例（Vercel 一键部署 / Docker 均可）。没配置时直接不渲染，
 * 不会留一个加载失败的空盒子。
 *
 * 主题切换用的是 Waline 自己的 `dark` 选项：传 CSS 选择器时它会把暗色变量
 * 注入成 `html[data-theme="graphite"]{--waline-…}` 这条规则，属性一变就自动
 * 生效，不需要销毁重建实例、也不会丢掉正在输入的评论。
 */

export function WalineComments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!WALINE_SERVER_URL || !ref.current) return;

    // init 是同步的，直接拿到实例即可在卸载时销毁
    const instance = init({
      el: ref.current,
      serverURL: WALINE_SERVER_URL,
      lang: "zh-CN",
      dark: `html[data-theme="${DARK_THEME}"]`,
      // 与全站一致的排序；分页沿用 Waline 默认
      commentSorting: "latest",
    });

    return () => instance?.destroy();
  }, []);

  if (!WALINE_SERVER_URL) return null;
  // 外层的分隔线与间距由 Comments 统一负责，这里只出评论本体
  return <div ref={ref} />;
}
