---
title: "让 Memos 匿名公开访问：从部署到博客接入"
slug: "memos-anonymous-public-access"
date: "2026-09-12"
category: "开发"
status: "Published"
tags: ["Memos"]
summary: ""
---



新版本 Memos（0.30+）开箱是**私密模式**：匿名访客被重定向到登录页，RSS、Explore、公开主页全部不可用，`/api/v1/memos` 也不会返回数据。

开关只有一个：`MEMOS_INSTANCE_URL`。**设置它 = 启用公开模式**，留空 = 私密模式。

```bash
# 移除之前默认的memos
docker rm -f memos

docker run -d --name memos \
  --network host \
  -e MEMOS_INSTANCE_URL=https://memos.tius.cn \
  -v ~/.memos/:/var/opt/memos:Z \
  usememos/memos:latest
```

重建前**先备份数据库**，出了问题能秒回滚：

```bash
root@tiusmini:~$ ls ~/.memos
assets  memos_prod.db  memos_prod.db-shm  memos_prod.db-wal
root@tiusmini:~$ cp ~/.memos/memos_prod.db ~/.memos/memos_prod.db.bak
```

数据都在 `~/.memos/memos_prod.db`（sqlite）。删容器不丢数据（数据在挂载卷里），但重建配置一旦出错，这份备份就是回滚的底气。

值必须是完整的 canonical 外部 URL（带协议），比如 `https://memos.tius.cn`。只配内网 IP 的话，生成的链接、重定向都会指向内网地址。


## 匿名拉取 API

公开模式下的公共接口**免鉴权**：

```
GET /api/v1/memos?limit=100[&pageToken=<nextPageToken>]
```

- 无需登录、无需 Token，直接 fetch 就有
- 返回 `{ memos: [...], nextPageToken }`，循环翻页直到 `nextPageToken` 为空
- 过滤条件：只保留 `state === "NORMAL"` 且 `visibility === "PUBLIC"`，避免垃圾状态混入

博客侧的同步脚本就这样逐页拉全量，写入 `content/memos/` 快照。

## 通过 Cloudflare Tunnel 暴露

```ini
[Service]
Restart=always
ExecStart=/usr/bin/docker run --rm --network host --name cloudflared \
  cloudflare/cloudflared:latest tunnel --no-autoupdate \
  --protocol http2 --conn 1 --edge-ip-version 4 run --token <TOKEN>
```

> 或在Cloudflare中设置路由 指向本地memos服务 `http://localhost:5230`，**别写成 https**——后端是明文 HTTP，写错就是 502。

![Cloudflare中设置路由](https://r2.tius.cn/media/1789196699807.png)

## 小结

让 Memos 匿名公开访问，核心就一件事：**设置 `MEMOS_INSTANCE_URL` 退出私密模式**，然后确保 memo 是 `PUBLIC`、实例允许公开。剩下的翻页、快照、同步都是博客侧的活。
