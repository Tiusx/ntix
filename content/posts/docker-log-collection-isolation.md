---
title: "Docker容器日志采集与隔离性矛盾：挂载卷 vs stdout"
slug: "docker-log-collection-isolation"
date: "2021-01-25"
category: "开发"
tags: ["stdout", "隔离性", "挂载卷", "ELK", "Fluentd"]
summary: "传统应用迁移Docker，挂载宿主机目录存日志破坏容器隔离性，介绍云原生stdout日志采集最佳实践。"
status: "Published"
page_id: "3dd16576-aec8-81b0-887e-d1a77f7a611e"
last_edited_time: "2026-09-16T17:55:00.000Z"
---


## 适用环境

- Docker容器部署
- 传统Java/PHP应用，日志输出到容器内文件

## 问题现象


老应用迁移Docker，日志写在容器内部文件；容器销毁日志直接丢失。
运维使用 `-v /host/logs:/var/log` 挂载宿主机目录持久化日志，带来两个问题：

1. 容器迁移困难，宿主机磁盘容易被业务写满；
2. 多容器日志混杂，权限管理混乱。

## 排查过程

1. 调研业界方案，主流ELK/EFK日志栈。
2. 对比「挂载宿主机目录」与「stdout标准输出」两套方案。
3. Docker原生`json‑file`日志驱动，可以把容器输出的stdout统一收集。
4. 确定方案：业务日志全部输出stdout，由Docker守护进程统一处理。

## 根本原因


容器设计理念：不可变、隔离。挂载宿主机目录会破坏容器隔离性，容器强依赖宿主机文件系统，违背云原生设计思想。


## 解决方案


### 方案一：日志输出到 stdout/stderr（最佳实践）


应用修改日志配置，输出到控制台标准输出。
使用`json‑file`日志驱动，Docker Daemon自动完成日志轮转。


### 方案二：部署Fluentd/Logstash采集容器日志


宿主机部署采集容器，监听Docker日志事件，转发日志到Elasticsearch或者Kafka。


### 方案三：Docker日志驱动插件


使用gelf、syslog等日志驱动，Docker直接把日志发送外部服务。


## 总结


容器内部不要写文件日志，日志统一输出stdout。这是云原生标准范式，配合EFK/ELK完成集中检索。

