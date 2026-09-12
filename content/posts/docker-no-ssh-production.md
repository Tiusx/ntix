---
title: "生产环境为何禁止SSH进入Docker容器及替代调试方案"
slug: "docker-no-ssh-production"
date: "2020-06-30"
category: "开发"
status: "Published"
tags: []
summary: "生产容器不要安装sshd，容器不是虚拟机，介绍docker exec/kubectl exec以及云原生调试规范。"
---


## 适用环境
- 生产环境Docker/K8s集群
- 运维习惯SSH登录容器查看日志、修改配置

## 问题现象
容器化上线后，运维习惯SSH登录容器。部分团队在Dockerfile安装`openssh‑server`，镜像体积膨胀，还存在root密码泄露安全风险。

## 根本原因
容器是进程隔离，不是虚拟机。生产容器应当无状态、不可变。
如果登录容器修改文件，会破坏镜像一致性；同时启动sshd违背「一个容器只运行一个主进程」的最佳实践。

## 解决方案

### 1. 使用 docker exec / kubectl exec 临时调试
```bash
docker exec -it container_id /bin/sh
kubectl exec -it pod_name -- /bin/sh
```
> 只用来排查问题，**禁止修改容器内配置文件**。

### 2. 通过环境变量注入配置
环境差异全部通过ENV环境变量注入，不要运行时修改配置文件。

### 3. 集中日志与监控体系
- 日志：stdout + ELK 收集
- 指标：暴露metrics接口，Prometheus采集
- 链路追踪：SkyWalking等APM工具

### 4. 远程调试端口（仅限测试环境）
Java开启JDWP、PHP开启Xdebug端口映射，不要用SSH。

## 团队规范建议
生产环境所有变更必须走CI/CD重建镜像。
不允许exec进去修改文件。
排查问题可以使用临时调试容器（ephemeral container）。
