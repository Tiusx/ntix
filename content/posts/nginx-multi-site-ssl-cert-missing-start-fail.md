---
title: "Nginx多站点混合HTTPS/HTTP配置导致启动找不到证书"
slug: "nginx-multi-site-ssl-cert-missing-start-fail"
date: "2021-08-15"
category: "开发"
tags: ["Nginx", "证书", "多站点配置"]
summary: "Nginx多站点同时配置HTTP与HTTPS，出现缺少SSL证书导致服务启动失败的排错方案。"
status: "Published"
page_id: "3dd16576-aec8-81d5-97fe-d11d2c496e56"
last_edited_time: "2026-09-16T17:51:00.000Z"
---


## 适用环境

- Nginx 1.16+
- 同一服务器同时部署HTTP、HTTPS多个站点

## 问题现象


新增纯HTTP站点（只监听80端口），重启Nginx报错：


```plain text
nginx: [emerg] SSL_CTX_use_PrivateKey_file("/path/to/missing/key.pem") failed
```

> 
>
> 明明新站点不需要HTTPS，却报SSL证书缺失。
>
>

## 排查过程

1. 检查新站点server块，没有写 `ssl_certificate`、`ssl_certificate_key`。
2. 确认nginx.conf已经加载ssl模块。
3. 发现有另一个server块写了 `listen 443 ssl;`，但是没有配置证书。

## 根本原因


Nginx启动会加载全部server块。只要server块包含 `listen 443 ssl;` 或旧语法 `ssl on;`，就必须配套证书配置。如果缺失证书，Nginx会尝试加载系统默认证书路径，文件不存在直接启动失败。
另外也可能出现 `default_server` 冲突、ssl指令被错误继承的情况。


## 解决方案


### 修复方案

1. 遍历所有监听443端口的server块，每一个开启ssl的块都必须配置证书私钥。
2. 不需要HTTPS的站点，删除 `listen 443 ssl;`、`ssl on;`。

❌错误示例：


```plain text
server {
    listen 443 ssl;
    # 缺少 ssl_certificate 和 ssl_certificate_key
}
```


✅正确示例：


```plain text
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
}
```

> 
>
> 不推荐使用default_server占位443端口：即便占位，仍然需要合法证书，否则依旧报错。
>
>

## 最佳实践

1. 把SSL证书配置抽离成独立include文件，便于多站点复用。

```plain text
include /etc/nginx/conf.d/ssl_common.conf;
```

1. 证书文件权限校验：

```bash
chmod 644 *.crt
chmod 600 *.key
```

