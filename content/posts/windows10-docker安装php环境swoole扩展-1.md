---
title: "Windows10 docker安装PHP环境swoole扩展"
slug: "windows10-docker安装php环境swoole扩展-1"
date: "2021-07-07"
category: "开发"
status: "Published"
tags: ["技术","Docker","Swoole"]
summary: "Windows10 docker安装PHP环境swoole扩展"
---

>  ###### 概述

本教程安装版本 `php7.4` `swoole4.6.4`
步骤：
1. 安装php镜像
2. 创建php容器
3. 安装`gcc` `g++`编译环境
4. 安装`swoole`扩展
5. 配置`php.ini`
6. 重启容器

>  ###### `docker` 安装`PHP`

```shell
# 首先docker下载php7.4的镜像
docker pull php:7.4
```

>  ###### 创建容器

```shell
# 创建php7.4的容器
docker run -it --name TiusPHP7.4 php:7.4 bash
# 进入容器后，可以php-v查看当前版本
php -v
#PHP 7.4.21 (cli) (built: Jul  1 2021 19:23:47) ( NTS )
#Copyright (c) The PHP Group
#Zend Engine v3.4.0, Copyright (c) Zend Technologies
# 查看是否已安装swoole扩展
php -m 
#[PHP Modules]
# ...  扩展列表
#[Zend Modules]
```

>  ###### 安装`Swoole`扩展

进入容器后，查看对应版本及扩展后，我们可以看到并没有安装`swoole`
现在安装`swoole`的扩展

>  ###### 更新镜像源

```
apt-update ## 等待更新完成
```

>  ###### 安装必要的编译环境`gcc` `g++`

```
apt install -y gcc g++ autoconf libtool make
```

>  ###### 使用`pecl`安装`swoole`扩展

如果报错找不到`curl`
根据报错提示使用`apt-get install libcurl4-openssl-dev`安装后
再使用`pecl install swoole`安装`swoole`

```
pecl install swoole
```

>  ###### 修改配置`php.ini`

使用`php --ini` 找到`php.ini`配置文件
写入扩展`extension=swoole`

```
extension=swoole
```

>  ###### 没有`php.ini`则修改`docker-php-ext-sodium.ini`

使用`php --ini` 或者 使用`whereis`查看`php`安装目录

```shell
php --ini

 # 配置文件（php.ini）路径
 Configuration File (php.ini) Path: /usr/local/etc/php
 # 已加载配置文件
 Loaded Configuration File:         (none)
 # 扫描PHP conf.d 下的其他ini 文件
 Scan for additional .ini files in: /usr/local/etc/php/conf.d
 # 解析的其他.ini文件
 Additional .ini files parsed:      `/usr/local/etc/php/conf.d/docker-php-ext-sodium.ini`
```

```shell
whereis php

php: 
/usr/local/bin/php 
/usr/local/etc/php 
/usr/local/lib/php 
/usr/local/php 
/usr/src/php/php.ini-development 
/usr/src/php/php.ini-production
```

默认情况下是在`/usr/local/etc/php/conf.d/`目录下
`/usr/local/etc/php/conf.d/docker-php-ext-sodium.ini`
写入`extension=swoole`

![image.png](https://rimg.tius.cn/images/d7e181bf5abd4fd3b0d16b0f47f3f1111cc2885f.png#blurhash=L16t%3An.N7voO%7E8teF%3FV%5BI%5BV%7BwMjY&width=251&height=87)

>  ###### 重启容器

```shell
# 重启容器
docker restart TiusPHP7.4
```

> ###### 检查`swoole`扩展

检查`swoole`是否安装成功
```shell

# 进入容器
docker exec -it TiusPHP7.4 bash
# 检查扩展
php -m
#[PHP Modules]
# ...  扩展列表
# swoole
# ...
#[Zend Modules]
```

