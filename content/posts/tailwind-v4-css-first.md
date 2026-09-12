---
title: "Tailwind v4 的 CSS-first 配置实践"
slug: "tailwind-v4-css-first"
date: "2026-09-06"
category: "开发"
status: "Published"
tags: ["tailwind","css","next"]
summary: "从 JS 配置文件迁移到 CSS-first 后，主题变量和 @theme 的工作方式完全变了。记录迁移中的几个关键点。"
---

## 为什么值得迁移

Tailwind v4 把配置从 `tailwind.config.js` 挪进了 CSS。好处是配置和样式同处一处，主题变量天然可被 CSS 引用。

## 主题变量的写法
直接在根元素上声明 CSS 变量，再用 `@theme inline` 映射到工具类。
```css
html[data-theme="graphite"] {
  --bg: #1d2021;
}
```

这样 `bg-page` 这类语义类就能跟随主题切换。

## 注意的点

- 未用到的工具类不会生成进产物
- 任意值语法 `[animation:spin_16s_linear_infinite]` 非常灵活
- 字体建议通过 `<link>` 引入而不是 `next/font`

整体迁移成本不大，值得一试。