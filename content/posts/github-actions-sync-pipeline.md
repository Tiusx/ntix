---
title: "把 GitHub Actions 自动同步提交流水线"
slug: "github-actions-sync-pipeline"
date: "2026-08-15"
category: "开发"
status: "Published"
tags: ["ci","notion","github-actions"]
summary: "把 Notion 内容拉取、构建、部署串成一条自动流水线，下面是如何拆分的。"
---

## 三个步骤

- 拉取：脚本定时从 Notion API 拉取文章，落盘为 Markdown
- 构建：`pnpm build` 产出静态文件
- 部署：推送到 Cloudflare Pages

## 状态文件

用一个 `.sync-state.json` 记录上次同步的游标，增量抓取避免重复请求。

## 环境变量

Token 和数据库 ID 通过 `.env.local` 注入，CI 里用仓库 Secrets，避免泄露。
整条链路跑通后，写文章就只需要在 Notion 里动动手指。