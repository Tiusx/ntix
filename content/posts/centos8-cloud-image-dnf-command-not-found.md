---
title: "CentOS8云镜像初始化后找不到dnf命令的故障处理"
slug: "centos8-cloud-image-dnf-command-not-found"
date: "2020-07-15"
category: "开发"
status: "Published"
tags: ["CentOS 8","dnf","云镜像"]
summary: "CentOS8最小化云镜像缺少完整dnf，仅自带microdnf，导致执行dnf命令提示command not found的解决办法。"
---


## 适用环境
- CentOS 8 / CentOS 8‑stream 最小化安装
- 云厂商提供的基础镜像（AWS、阿里云等）

## 问题现象
CI/CD流水线新建 CentOS8 虚拟机，执行安装命令报错：
```
-bash: dnf: command not found
```
> 注意：CentOS8 中 `yum` 是 `dnf` 的软链接，yum 同样无法使用。

## 排查过程
1. `which dnf` 无输出，系统不存在 dnf 二进制程序。
2. 查看 `/usr/bin/` 目录，无 dnf 文件。
3. `rpm -qa | grep dnf` 确认 dnf 没有安装。
4. 系统只预装了轻量包管理器 `microdnf`。

## 根本原因
云厂商为减小镜像体积，最小化镜像只部署 `microdnf`（C语言实现轻量版DNF），没有安装完整 Python3 版 dnf。`microdnf` 功能有限，命令集与 dnf 不完全一致，直接执行 dnf 就会提示命令不存在。

## 解决方案

### 方案一：安装完整 dnf（推荐）
```bash
microdnf install dnf
```
安装完成后即可正常使用 `dnf` 命令。

### 方案二：直接使用 microdnf
```bash
microdnf install nginx
microdnf update
```

### 方案三：手动 rpm 安装（不推荐）
下载 dnf 及其全部依赖 RPM，使用 `rpm -ivh` 安装。依赖链复杂，极易出错。

## 补充说明
CentOS 8‑stream 将 microdnf 作为默认包管理器之一。如果业务需要复杂依赖解析、事务回滚等高级能力，建议安装完整 dnf。
