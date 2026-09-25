# ntix

一个基于 [Next.js](https://nextjs.org) 16（App Router）的静态博客，`output: 'export'` 产出纯静态文件，零服务端依赖。内容以 [Notion](https://www.notion.so) 为编辑前端，构建时同步为 Markdown；说说部分来自自建的 [Memos](https://github.com/usememos/memos)。

## 特性

- **静态导出**：`out/` 纯静态文件，可部署到 Cloudflare Pages / nginx / S3 等任意静态托管
- **Notion 驱动**：文章与自定义页面在 Notion 中编辑，`scripts/notion/` 负责同步与图片转存
- **Markdown 文章**：frontmatter + GFM，代码块自动带语言标签与复制按钮，图片点击放大
- **Memos 说说**：构建前自动同步公开 memo，卡片式时间线、标签过滤、分页
- **分类 / 标签 / 归档**：自动聚合，`/blog/`、`/columns/`、`/archive/` 全静态页
- **搜索**：构建时生成全文索引，客户端加权评分 + 高亮
- **RSS 全文订阅**：正文以 `content:encoded` 输出
- **SEO**：sitemap / robots / canonical / JSON-LD / IndexNow 主动推送
- **双主题**：浅色 `nord`、深色 `graphite`，首屏前应用，无闪烁
- **评论**：Giscus

## 环境要求

**Node 24**、**pnpm 10**（版本见 `.nvmrc` 与 `packageManager`）

## 快速开始

```bash
pnpm install
pnpm build     # 产物在 out/
pnpm dev       # 本地开发
```

`prebuild` 会在构建前自动同步 memos 并生成搜索索引，因此首次构建需要能访问 Memos API（失败时保留上次快照，不影响构建）。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 本地开发服务器 |
| `pnpm build` | 静态构建到 `out/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint（flat config） |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` / `pnpm test:coverage` | Vitest 单元测试 |
| `pnpm verify` | typecheck + lint + test + build 全套 |

## 内容来源

### 文章（Notion）

文章存放在 Notion 数据库中，同步到 `content/posts/*.md`。

```bash
pnpm sync:posts              # 增量
pnpm sync:posts:full         # 全量 + 清理本地孤儿文件
pnpm sync:posts:force        # 忽略增量判断，全部重拉
pnpm sync:posts:dry          # 只预览，不写盘
```

同步流程：查询 Notion → 图片转存 Cloudflare R2 → 回写图片 URL 到 Notion → 生成 Markdown → 写入 `content/posts/`。

- 增量依据是 Notion 的 `last_edited_time` 与 `last_fetched_time` 的比较，水位记录在 `.fetch-state.json`。
- 同步是**镜像语义**：Notion 中已下架（`status` 不再是 `Published`）的内容会在全量同步时从本地删除。
- **安全护栏**：若 Notion 查询返回 0 条，或待删比例超过 50%，同步会直接中止并报错，绝不批量删除。
- Notion 属性被改名会导致同步**报错**（而不是静默产出空 frontmatter）。

### 自定义页面（Notion）

`/pages/[slug]` 下的页面（关于、友链等）同样由 Notion 驱动，源库为 `content/pages/*.md`。

```bash
pnpm sync:pages
pnpm sync:pages:full
```

### 说说（Memos）

见 [docs/memos-setup.md](docs/memos-setup.md)。需要 Memos 实例开启匿名公开访问。

```bash
pnpm sync:memos
pnpm sync:memos:dry
```

### 一次性迁移

把本地已有内容导入 Notion（按 slug 幂等）：

```bash
pnpm migrate:notion    # content/posts -> Notion Posts 库
pnpm migrate:pages     # content/pages -> Notion Pages 库
```

## 统一同步入口

```bash
pnpm sync:all             # memos(全量) + posts(增量) + pages(增量)
pnpm sync:all:full        # 全部全量
pnpm sync:all:strict      # 任一失败即非零退出（CI 用）
pnpm sync:all:dry         # 全程预览，不写任何文件
```

`--dry-run` 是真正的只读预览：不会写 `content/`、不会推进 `.fetch-state.json`、不会上传 R2、不会修改 Notion（R2 key 为内容寻址，因此仍能算出最终 URL）。

## 写文章

日常写作直接在 Notion 中完成。若要手工新增文件，参考 [`docs/post-template.md`](docs/post-template.md)：

```md
---
title: "文章标题"
slug: "your-slug"
date: "2026-09-12"
category: "随笔"        # 见下方分类注册表
tags: ["标签"]
summary: "一句话摘要"
---

正文 Markdown
```

`slug` 决定 URL，`date` 控制排序与归档。

> `content/` 由同步脚本生成，手工改动会在下次同步时被覆盖。

### 分类注册表

分类是「规划中的 taxonomy」：`src/lib/posts.ts` 中的 `CATEGORY_META` 是**唯一注册表**，即使某个分类当前 0 篇文章，它依然会生成页面、出现在 `/columns/` 与 sitemap 中。

新增分类时在 `CATEGORY_META` 里加一项（含一句描述）即可，构建期会校验「文章里用到但未注册」的分类并告警——这类文章不会出现在导航与 sitemap 中。

当前分类：开发 / 生活 / 随笔 / 其他。

> slug 会直接成为 URL 与文件名。中文可用（现网已有中文 slug），但请避免文件系统不友好的字符。

## 部署

### Cloudflare Pages

1. 推送仓库到 GitHub（默认分支 `main`）
2. Cloudflare Pages 连接仓库：构建命令 `pnpm build`，输出目录 `out`，Node 24，安装命令 `pnpm install`
3. 在平台构建环境变量中配置 `MEMOS_API`（自建 Memos 时）、`SITE_URL` 与 Giscus 变量

`prebuild` 会在构建时自动同步 memos 并生成搜索索引。

### 自动同步

`.github/workflows/sync.yml` 每小时同步一次并自动提交（UTC 04:00 / 16:00 跑全量清理）。该工作流另有三重删除保护：脚本内的空集合熔断、50% 比例阈值，以及提交前的 20% 删除比例护栏。

## 目录结构

```
content/posts/         文章（Notion 同步产物）
content/pages/         自定义页面（Notion 同步产物）
content/memos/         说说（Memos 同步产物）
src/app/               App Router 页面与路由
src/components/        组件（灯箱、代码块、说说卡片等）
src/lib/               内容读取、主题常量、搜索索引类型
scripts/notion/        Notion 同步与迁移
scripts/lib/           重试、命令行参数等共享工具
tests/                 Vitest 单元测试
docs/                  配置与使用文档
out/                   构建产物（静态导出）
```

## 相关文档

- [Memos 部署与匿名访问配置](docs/memos-setup.md)
- [文章模板](docs/post-template.md)

## 开源协议

[MIT](LICENSE)
