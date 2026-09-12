---
title: "CentOS7环境Nginx try_files返回404但return指令正常的排错"
slug: "centos7-nginx-tryfiles-404-return-normal"
date: "2021-03-12"
category: "开发"
status: "Published"
tags: ["Nginx","try_files"]
summary: "CentOS7下Nginx try_files一直404，return却正常，定位default.conf配置冲突问题。"
---

## 适用环境
- CentOS7 + yum安装Nginx
- 使用 `try_files` 做路由重写

## 问题现象
Ubuntu环境测试正常的Nginx配置，迁移到CentOS7之后：
- `try_files` 始终返回404
- 同 location 块内 `return 200 "test";` 可以正常返回

## 排查过程
1. 校验文件权限：nginx worker用户`nginx`拥有文件读权限。
2. 检查root路径，末尾不要多余斜杠。
3. 查看nginx错误日志：
```
"/usr/share/nginx/html/index.html" is not found
```
> 实际网站文件存放于 `/var/www/html`。
4. 发现 `/etc/nginx/conf.d/default.conf` 默认配置文件存在，配置了 `root /usr/share/nginx/html;`。

## 根本原因
yum安装的CentOS7 Nginx自带 `default.conf`，监听80端口，`server_name _;` 匹配全部请求。该配置的root会覆盖自定义站点root。
`try_files` 依赖root去查找磁盘物理文件，root被覆盖，就会一直404；而`return`不需要读取磁盘文件，所以可以正常工作。
Ubuntu的Nginx没有这个强冲突的default.conf，迁移时很容易忽略该问题。

## 解决方案

### 方案一：直接删除默认配置（推荐）
```bash
rm -f /etc/nginx/conf.d/default.conf
nginx -s reload
```

### 方案二：修改default.conf
删除 `listen 80 default_server;`，避免抢占默认服务。

### 方案三：显式声明root
在自定义server块明确写root，保证try_files读取正确路径。

## 调试建议
查看全部加载配置，排查冲突server块：
```bash
nginx -T
```
