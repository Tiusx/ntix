---
title: "Docker构建镜像composer/apt-get网络问题频繁失败"
slug: "docker-build-network-failure"
date: "2021-04-18"
category: "开发"
tags: ["composer", "apt-get", "国内镜像源"]
summary: "CI流水线docker build，composer install、apt‑get经常网络超时失败，国内镜像源+Docker层缓存优化方案。"
status: "Published"
page_id: "3dd16576-aec8-8154-a8c7-eaf58f71686e"
last_edited_time: "2026-09-16T17:51:00.000Z"
---


## 适用环境

- CI/CD流水线（Jenkins/GitLab CI）
- Dockerfile中执行各类包管理命令

## 问题现象


执行`docker build`构建镜像，`composer install`或者`apt‑get update`经常报`Connection timed out`、`Could not resolve host`。重试多次偶尔成功，流水线稳定性很差。


## 排查过程

1. 修改 `/etc/docker/daemon.json`，配置国内DNS（`114.114.114.114`）。
2. 尝试`--network=host`构建，故障依旧。
3. 定位根源：海外软件源（packagist.org、deb.debian.org）国内访问抖动大。

## 根本原因


Docker构建阶段使用默认bridge网络，跨境访问质量差。包管理器下载元数据，轻微网络抖动就直接构建失败。


## 解决方案


### 方案一：替换为国内镜像源（最佳实践）


**Composer**


```docker
RUN composer config -g repo.packagist composer https://packagist.phpcomposer.com
```


**Debian/Ubuntu APT**


```docker
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list
```


**Alpine APK**


```docker
RUN sed -i 's/dl‑cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
```


### 方案二：利用Docker层缓存优化


先复制依赖清单文件，安装依赖，再复制业务源码。依赖文件不变就复用缓存层，减少网络下载次数。


```docker
COPY composer.json composer.lock ./
RUN composer install
COPY . .
```


### 方案三：搭建私有代理仓库


公司内部搭建Nexus/Private Packagist，构建时直接访问内网源。


### 方案四：构建使用host网络（测试环境）


```bash
docker build --network=host -t myapp .
```

> 
>
> 生产构建不建议，会直接暴露宿主机网络。
>
>

## 小结


容器构建网络问题是高频坑。优先替换国内镜像源，配合Docker分层缓存，可以把构建成功率提升到99.9%以上。

