---
title: "Docker --link容器重启后IP未刷新导致服务发现失败"
slug: "docker-link-ip-stale"
date: "2020-11-20"
category: "开发"
status: "Published"
tags: ["IP变更","服务发现"]
summary: "Docker旧版--link静态写入/etc/hosts，容器重启IP变更后域名解析旧IP，造成连接失败，给出替代方案。"
---


## 适用环境
- Docker 1.13 ~ 19.03，使用 `--link` 做容器间通信的老旧部署方式

## 问题现象
使用 `docker run --link mysql:db` 启动业务容器，业务通过主机名 `db` 连接MySQL。
MySQL容器故障重启，IP地址发生改变；业务容器依旧连接旧IP，报 `Connection refused`。

## 排查过程
1. 进入业务容器查看hosts：
```bash
cat /etc/hosts
```
发现 `db` 对应的IP是MySQL重启之前的旧地址。
2. 重启业务容器，`/etc/hosts` 才会更新为新IP。
3. 查阅Docker官方文档：`--link` 只在容器启动时刻静态写入hosts，运行期不会动态更新。

## 根本原因
`--link` 原理：容器启动阶段往双方 `/etc/hosts` 写入静态域名‑IP映射。依赖容器IP固定不变。
Docker默认bridge网络，容器重启会重新分配IP，静态hosts条目直接失效。

## 解决方案

### 方案一：使用自定义桥接网络 User‑defined bridge（推荐）
```bash
# 创建自定义网络
docker network create mynet
# 启动mysql，加入自定义网络
docker run --net=mynet --name mysql mysql:5.7
# 启动业务容器，加入同一个网络
docker run --net=mynet --name app myapp
```
自定义网络内置Docker DNS，容器名可以直接作为主机名，容器重启IP变化DNS自动同步。

### 方案二：Docker Compose
compose默认创建自定义网络，服务名直接做域名，自动动态解析。

### 方案三：引入服务注册发现
- K8s环境使用Service+Endpoint
- Swarm/Consul使用注册中心做服务发现

## 生产建议
`--link` 已经被Docker标记为legacy遗留特性，新项目禁止使用。容器之间通信统一使用自定义网络+DNS解析。
