---
title: "给你家 RSS 加上全文输出"
slug: "rss-full-text"
date: "2026-06-28"
category: "开发"
status: "Published"
tags: ["rss","博客","web"]
summary: "很多阅读器会对摘要源进行降权。让 RSS 输出全文，订阅者体验会好很多。"
---

## 为什么全文
摘要是给「流量」写的，全文是给「读者」写的。独立博客的核心读者往往用 RSS 追更。

## 实现

在 `app/rss.xml` 的路由里直接拼接每篇文章的 HTML，而不是只输出描述。
```ts
const content = posts
  .map((p) => `<item><title>${p.meta.title}</title>${html}</item>`)
  .join("");
```

## 别忘了
- 加上 `guid` 和可读的 `pubDate`
- 输出 `XML` 响应头
- 订阅链接加到首页和页脚
一个友好的摘要，不如一篇完整的正文。