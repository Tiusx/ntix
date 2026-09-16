---
title: "SSH ServerIp Err:Host key verification failed"
slug: "ssh-serverip-errhost-key-verification-failed"
date: "2026-09-11"
category: "开发"
tags: ["SSH"]
summary: "今天家里网络重启了，在折腾Mini主机时，Mini主机的ip也变了，发现ssh远程连不上"
status: "Published"
page_id: "3dd16576-aec8-8100-8688-d0c405ec90c8"
last_edited_time: "2026-09-16T17:52:00.000Z"
---


## 前言

> 
>
> 今天家里网络重启了，在折腾Mini主机时，Mini主机的ip也变了，发现ssh远程连不上,
>
>

## 问题


关键信息：


```shell
Host key for 192.168.2.60 has changed and you have requested strict checking.
Host key verification failed.
```


![1789147653195_1789145512406.png](https://r2.tius.cn/media/1789147653195_1789145512406.png)


## 解决


```shell
ssh-keygen -R 192.168.2.60
```


![1789147651747_1789145646058.png](https://r2.tius.cn/media/1789147651747_1789145646058.png)

