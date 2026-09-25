---
title: "在这里写文章标题"
slug: "your-post-slug-here"
date: "2026-09-12"
# 分类必须是 CATEGORY_META（src/lib/posts.ts）中已注册的一项：
# 开发 / 生活 / 随笔 / 其他。未注册的分类不会出现在 /columns/ 与 sitemap 中，
# 构建期会告警。
category: "随笔"
tags: ["示例标签"]
summary: "一句话摘要，会显示在文章列表和搜索结果里。"
cover: "https://r2.tius.cn/media/example-cover.png"
---

# 文章模板

> 日常写作请直接在 Notion 中编辑，本目录由 `scripts/notion/` 同步生成，
> 手工改动会在下次同步时被覆盖。本模板仅用于说明 frontmatter 字段含义。

## 正文从这里开始

直接写 Markdown，支持 GFM（表格、任务列表、删除线）。

- [x] 待办示例
- [ ] 另一个待办

支持代码块，会自动带语言标签和复制按钮：

```ts
const hello = "world";
console.log(hello);
```

支持图片，点击可放大：

![图片描述](https://r2.tius.cn/media/example.png)

更多语法参考：加粗 **粗体**、斜体 *斜体*、行内代码 `code`、引用：

> 引用内容