---
title: "React 19 下静态导出的几个坑"
slug: "react-19-static-export-gotchas"
date: "2026-07-30"
category: "开发"
status: "Published"
tags: ["react","next","静态导出"]
summary: "output: export 模式下遇到的一些问题与解法，包括 generateStaticParams 返回空数组的报错。"
---

## 空数组报错
静态导出要求至少有一个路由。文章还没发表时，`[page]` 分页路由返回空数组会直接构建失败。
绕法是用 `Math.max(count, 2)` 生成一个占位页，等文章够多再自动变成真实分页。

## PageProps 的坑

这个版本的 `PageProps` 是全局注入的类型，不能从 `next` 里显式导入，否则会报 TS2614。

## 结论

静态导出让托管变得极其简单，代价是牺牲了一部分动态能力。对个人博客来说完全够用。