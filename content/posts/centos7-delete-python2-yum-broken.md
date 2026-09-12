---
title: "CentOS7误删系统Python2引发YUM工具彻底失效修复"
slug: "centos7-delete-python2-yum-broken"
date: "2020-09-08"
category: "开发"
status: "Published"
tags: ["YUM","Python 2"]
summary: "CentOS7卸载系统自带Python2导致yum完全不可用，解析原因与rpm强制修复方案。"
---


## 适用环境
- CentOS 7.x
- 为使用 Python3，误卸载系统自带 Python2

## 问题现象
执行 `yum remove python` 或 `rpm -e python` 之后，所有 yum 命令报错：
```
/usr/bin/yum: /usr/bin/python: bad interpreter: No such file or directory
```

## 排查过程
1. 尝试软链接修复：`ln -s /usr/bin/python3 /usr/bin/python`，依然报错。
> 原因：yum依赖的 `urlgrabber` 等模块是 Python2 语法，Python3 无法兼容运行。
2. yum已经无法使用，只能依靠 rpm 命令手动恢复。

## 根本原因
CentOS7 的 yum 基于 Python2.7 开发，全部核心组件、插件强依赖系统 Python2。删除系统Python2等于直接删掉yum的解释器。简单建立python3软链接不能解决库兼容问题。

## 解决方案

### 抢救步骤（需要本地rpm包源）
1. 下载 Python2.7 全套rpm包：`python`、`python-libs`、`python-urlgrabber` 等依赖。
2. 强制重装Python2相关包：
```bash
rpm -ivh python-2.7.5-*.el7.x86_64.rpm --nodeps
rpm -ivh python-libs-2.7.5-*.el7.x86_64.rpm --nodeps
rpm -ivh python-urlgrabber-3.10-*.el7.noarch.rpm --nodeps
```
3. 重装 yum 工具：
```bash
rpm -ivh yum-*.el7.noarch.rpm
```

### 稳妥备选方案
机器数据不重要可以直接重装系统。生产环境优先使用快照/备份恢复。

## 经验教训
**严禁卸载 CentOS7 系统自带 Python2**。
需要 Python3 直接并行安装：
```bash
yum install python3
```
也可以使用 SCL 软件集，不要替换系统默认 python。
