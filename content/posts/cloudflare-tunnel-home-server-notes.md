---
title: "家用 mini 主机部署 Cloudflare Tunnel 踩坑笔记"
slug: "cloudflare-tunnel-home-server-notes"
date: "2026-09-11"
category: "开发"
tags: ["Memos", "Cloudflare", "Docker"]
summary: "在 Docker 里跑 cloudflared 连不上隧道：先是 DNS 超时，再是 QUIC 握手超时，最后是 502。记录每一层的排查与解决。"
status: "Published"
page_id: "3dd16576-aec8-8194-80ce-ea936830affd"
last_edited_time: "2026-09-16T17:51:00.000Z"
---


## 现象


在家用 mini 主机（Docker 容器）里启动 cloudflared，一直报错：


```plain text
lookup _v2-origintunneld._tcp.argotunnel.com on 114.114.114.114:53: i/o timeout
```


edge discovery、SRV 记录全部 FAIL，隧道始终起不来。


## 排查过程


### 1. DNS 超时 → 用 host 网络


`114.114.114.114`、`1.1.1.1` 都不通，但主机上 `dig @223.5.5.5` 秒回，容器里却超时。


结论：**Docker bridge 网络的 UDP/53 出站被挡**。绕开它：


```bash
docker run --network host cloudflare/cloudflared:latest tunnel run --token <TOKEN>
```


### 2. QUIC 握手超时 → 改用 http2


DNS 好了，又报：


```plain text
failed to dial to edge with quic: timeout handshake
```


QUIC 走 UDP 7844，国内网络容易超时。强制走 TCP 443：


```bash
--protocol http2
```


### 3. 备用连接报错 → 不用管


日志里偶尔出现某条 `connIndex` 对某边缘节点握手超时。cloudflared 默认开多条连接，**只要一条 Registered 就正常**，其余是重试噪音。想干净一点：


```bash
--conn 1 --edge-ip-version 4
```


### 4. 隧道通了但 502 → Service 写成 https


后端服务 memos 是明文 HTTP，后台却配了：


```plain text
https://localhost:5230
```


改回：


```plain text
http://localhost:5230
```


## 稳定运行的最终配置


systemd 守护 + Docker，开机自启：


```plain text
[Service]
Restart=always
ExecStart=/usr/bin/docker run --rm --network host --name cloudflared \
  cloudflare/cloudflared:latest tunnel --no-autoupdate \
  --protocol http2 --conn 1 --edge-ip-version 4 run --token <TOKEN>
```


内网服务（memos）最好也用 host 网络，`ufw allow 5230` 放行，隧道转发指向 `http://localhost:5230`。


## 小结


三个关键点：

1. **主机通 ≠ 容器通**——Docker bridge 的 UDP/53、NAT 可能单独被挡，改 `--network host` 最省事。
2. **国内跑隧道两个高频坑**：UDP 被干扰（用 `--protocol http2`）、部分边缘节点不可达（属正常冗余重试）。
3. 502 先查后台 Service 协议，http/https 写错是最常见原因。
