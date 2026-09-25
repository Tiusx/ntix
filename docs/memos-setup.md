# Memos 接入配置

本博客的「说说」页面 `/memos/` 内容来自一个自建的 [Memos](https://github.com/usememos/memos) 实例，通过其匿名公开 API 拉取。

- 拉取脚本：`scripts/sync-memos.ts`
- 产物目录：`content/memos/*.md`
- 页面路由：`/memos/`、`/memos/[page]/`、`/memos/tag/[tag]/`

## 前置：Memos 必须开启匿名公开访问

新版 Memos（0.30+）**默认是私密模式**：匿名访客会被重定向到登录页，API、RSS、Explore 与公开主页全部不可用。必须显式开启。

1. 在 Memos 设置中把 **Instance URL** 填成完整的外部地址，例如：

   ```
   https://memos.tius.cn
   ```

   必须是完整 URL（含 scheme），只填域名不会生效。

2. 确认匿名访问已开放：用一个无痕窗口打开 `https://<你的域名>/explore`，应能看到公开的 memos 而不是登录页。

3. 验证 API 可匿名读取：

   ```bash
   curl "https://<你的域名>/api/v1/memos?limit=1&pageToken="
   ```

   返回 JSON 且含 `memos` 数组即正常。若返回 401/403，说明匿名访问尚未开启。

> 若你用反向代理并强制 HTTPS，请确保 `MEMOS_INSTANCE_URL` 使用的协议与实际访问协议一致，否则 Memos 的公开判定会失败。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需覆盖：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `MEMOS_API` | Memos 列表 API 完整地址 | `https://memos.tius.cn/api/v1/memos` |
| `SITE_URL` | 站点根地址，用于 canonical / sitemap / RSS | `https://tius.cn` |

只有在你自建 Memos 时才需要设置 `MEMOS_API`；用默认实例时留空即可。

> 注意：脚本会显式加载 `.env.local` 与 `.env`。在 Cloudflare Pages 等平台上构建时，
> 环境变量需配置在平台的构建环境里，`prebuild` 阶段不会自动读到仓库中的文件。

## 同步行为

```bash
pnpm sync:memos          # 手动同步
pnpm sync:memos:strict   # 失败时以非零退出（CI 用）
pnpm sync:memos:dry      # 只打印将要发生的变更，不写盘
```

同步是**全量镜像**语义：

- 只保留 `state === "NORMAL"` 且 `visibility === "PUBLIC"` 的 memo。
- 与远端不一致的文件会被重写。
- 本地存在但远端已消失的 `.md` 会被删除。

`prebuild` 会在每次 `pnpm build` 之前自动同步一次，因此本地构建与 Cloudflare Pages 构建都会拿到最新内容。CI 另有工作流每小时同步并提交，见 `.github/workflows/sync.yml`。

失败时（非 strict 模式）会打印警告并**保留上一次的快照**，不会把内容清空。

## memo 文件格式

每条 memo 对应一个以 memo ID 命名的文件：

```md
---
slug: "DoEAMxo5EaCY4CPBboZqCe"
date: "2026-09-20T13:24:11.000Z"
tags: ["随笔", "Memos"]
pinned: false
attachments: []
---

正文（Markdown）
```

- `slug` 即 Memos 的资源名（去掉 `memos/` 前缀），同时是文件名。
- `attachments` 记录原始附件信息，页面据此渲染附件卡片。
- `location` 仅在原 memo 带位置时出现。
- 文件名以下划线开头（如 `_placeholder.md`）的条目会被同步与索引逻辑跳过。

请勿手工编辑这些文件——下一次同步会覆盖。需要修正内容请改 Memos 端。
