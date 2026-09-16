---
title: "CentOS7更新CPU微码引发系统卡死与YUM缓存损坏问题复盘"
slug: "centos7-microcodectl-system-hang-yum-cache-corrupt"
date: "2019-12-25"
category: "开发"
tags: ["YUM", "microcode_ctl"]
summary: "CentOS7执行yum update更新microcode_ctl包出现内核卡死，重启后YUM缓存损坏无法使用的故障复盘与修复方案。"
status: "Published"
page_id: "3dd16576-aec8-816c-9c4b-f47e581b3a5a"
last_edited_time: "2026-09-16T17:50:00.000Z"
---


## 适用环境

- CentOS 7.x (x86_64)
- 执行 `yum update` 时包含 `microcode_ctl` 包

## 问题现象


2019 年底，大量 CentOS 7 运维人员在执行 `yum update -y` 时，系统在更新 microcode_ctl 固件包的中途完全卡死，键盘/网络均无响应。强制断电重启后，系统虽然能启动，但执行任何 yum 命令均报错：


```plain text
Error: Cannot retrieve repository metadata (repomd.xml) for repository: base. Please verify its path and try again
或
Could not open/read repomd.xml
```


## 排查过程

1. 检查 `/var/log/messages`，发现有微码更新失败的记录。
2. 执行 `yum clean all` 清理缓存，问题依旧。
3. 手动删除 `/var/cache/yum/*` 后执行 `yum makecache`，仍然报错。
4. 检查 `/etc/yum.repos.d/` 下 repo 文件，元数据 URL 访问正常，问题出在本地缓存写入环节。

## 根本原因


`microcode_ctl` 包用于更新CPU微码，更新过程会向 `/dev/cpu/*/msr` 写入数据。部分旧款CPU（例如 Intel Haswell 特定步进）与新版微码不兼容，直接触发内核卡死（kernel hang）。
强制重启后 YUM 事务没有正常结束，`repomd.xml` 缓存文件损坏，同时缓存锁文件未释放，最终导致 YUM 包管理器完全不可用。


## 解决方案


### 抢救修复 YUM


```bash
rm -rf /var/cache/yum/*
rm -rf /var/lib/yum/*
rpm --rebuilddb
yum clean all
yum makecache
```


### 屏蔽 microcode_ctl 包更新


编辑 `/etc/yum.conf`，增加排除配置：


```plain text
exclude=microcode_ctl
```


### 微码模块异常恢复


如果 `/dev/cpu/*/msr` 设备节点缺失，加载 msr 内核模块：


```bash
modprobe msr
```


## 预防措施

- 业务服务器尽量避开生产高峰执行系统更新。
- `kernel`、`microcode_ctl` 这类高危包，务必先在测试环境验证，再灰度上线。
- 更新时临时跳过该包：

```bash
yum --exclude=microcode_ctl update
```


## 相关 Issue

- Red Hat Bugzilla – Bug 1764074：microcode_ctl 更新导致系统冻结
