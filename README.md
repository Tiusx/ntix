# ntix

一个基于 [Next.js](https://nextjs.org)（App Router）的静态博客，`output: 'export'` 产出纯静态文件，零服务端依赖。个人风格化主题，支持 Markdown 文章、Memos 说说、标签归档、RSS 全量订阅。

## 特性

- **静态导出**：`out/` 纯静态文件，可部署到 Cloudflare Pages / nginx / S3 等任意静态托管
- **Markdown 文章**：frontmatter + GFM，代码块自动带语言标签与复制按钮，图片点击放大
- **Memos 集成**：构建前自动同步 `memos.tius.cn` 的公开说说，卡片式时间线、标签过滤、分页
- **分类 / 标签 / 归档**：自动聚合，`/blog/`、`/tags/`、`/categories/`、`/archive/` 全静态页
- **RSS 全量**：完整正文订阅源
- **暗黑主题**：石墨色 token 体系，原生支持浅色 / 深色

## 快速开始

环境要求：**Node 24**、**pnpm 10**

```bash
pnpm install
pnpm build
```

产物在 `out/` 目录。开发预览：

```bash
pnpm dev
```

## 写文章

在 `content/posts/` 下新建 `.md`，参考模板 [`docs/post-template.md`](docs/post-template.md)：

```md
---
title: "文章标题"
slug: "your-slug"
date: "2026-09-12"
category: "随笔"        # 开发 / 生活 / 随笔 / 读书 / 其他
tags: ["标签"]
summary: "一句话摘要"
---

正文 Markdown
```

`slug` 决定 URL，`date` 控制排序与归档，`category` 需在白名单内，`tags` 任意。

## Memos 同步

Memos 通过匿名公共 API 拉取（需服务器端设置 `MEMOS_INSTANCE_URL` 启用公开模式），详见 [`docs/memos-setup.md`](docs/memos-setup.md)。

```bash
pnpm sync:memos     # 手动同步（失败保留上次快照）
pnpm sync:memos:strict
```

`prebuild` 会在每次构建前自动同步。环境变量 `MEMOS_API` 可覆盖 API 地址（默认 `https://memos.tius.cn/api/v1/memos`），见 [`.env.example`](.env.example)。

## Cloudflare Pages 部署

1. 推送仓库到 GitHub（默认分支 `main`）
2. Cloudflare Pages 连接仓库：构建命令 `pnpm build`，输出目录 `out`，Node 24，安装命令 `pnpm install`（构建时自动执行 prebuild 同步 memos）
3. `.github/workflows/sync.yml` 每小时自动同步 memos 并提交

## 目录结构

```
content/posts/    文章（Markdown）
content/memos/    Memos 公开快照（构建时自动同步）
src/app/          App Router 页面
src/components/   组件（图片灯箱、代码块、卡片等）
src/lib/          数据读取与处理
scripts/          sync-memos 同步脚本
docs/             配置与使用文档
out/              构建产物（静态导出）
```

## 相关文档

- [Memos 部署与匿名访问配置](docs/memos-setup.md)
- [文章模板](docs/post-template.md)
- [家用 mini 主机部署 Cloudflare Tunnel 踩坑笔记](https://blog.tius.cn/posts/cloudflare-tunnel-home-server-notes/)

## 开源协议

本项目使用 [MIT](LICENSE) 许可证，欢迎自由使用与修改。