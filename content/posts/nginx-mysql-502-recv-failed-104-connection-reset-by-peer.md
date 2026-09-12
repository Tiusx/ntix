---
title: "Nginx-Mysql 502 recv() failed 104: Connection reset by peer"
slug: "nginx-mysql-502-recv-failed-104-connection-reset-by-peer"
date: "2021-06-01"
category: "开发"
status: "Published"
tags: ["技术"]
summary: ""
---


### 概述

昨日项目基本完工，然后走测试服测试项目时，接口返回，连接异常关闭，排错发现，我的Mysql服务`502`了，
![image.png](https://rimg.tius.cn/images/5fb6173735b3d93195f741d54eaf7a9f6abeee25.png#blurhash=L99H2_ofRjof%7EqofWBfQ%3FboeWBj%5B&width=680&height=205)


### 排错 `Nginx & php-fpm`
然后又继续排查`Nginx`日志，
发现`Nginx` 和 `php-fpm`通讯出现了问题
> recv() failed (104: Connection reset by peer) while reading response header from upstream
![image.png](https://rimg.tius.cn/images/43773d5314f48fd9f9cac6add8cd8e8a91974765.png#blurhash=L36Hy7xut8xu%7Eqofayofofofofjs&width=1115&height=102)



出现这种错误，通常都是`php-fpm`没能正常响应`Nginx`
导致`php-fpm`这种情况，要么程序执行超时，要么就是服务器进程内存泄露,
程序上，我也是测了又测的，程序执行时间都在配置的`php.ini,php-fpm.conf`的超时时间内，不存在那么久的超时，
### 解决
修改`php-fpm`配置文件
![image.png](https://rimg.tius.cn/images/602145e1c7c822dbaa54a8e660feef4a7b4f407c.png#blurhash=L14Bg%7B%7DswJozXSSgWUoLOrNabbjZ&width=584&height=725)


我这里是直接用`pm.max_requests = 500`来处理
意思是，当一个 `PHP-CGI` 进程处理的请求数累积到 500 个后，自动重启该进程。

如果`pm.max_requests`没有设置重启参数，默认为0不限制最大服务次数，也就是子进程永远不重启，长时间不重启子进程会导致系统负载异常，处理时间变长等现象。
```shell
pm = dynamic
pm.max_children = 35
pm.start_servers = 8
pm.min_spare_servers = 6
pm.max_spare_servers = 35
pm.max_requests = 500
```
>有时候由于 `php-fpm` 有好多闲置的进程一直不释放， 导致内存占用过大，`FastCGI` 进程一旦加载就不会释放，当其工作完成后，就休眠于 `FastCGI` 系统池中，等待下一次被唤醒。甚至是`php-fpm`假死，也会出现`502`的错误，只能重启`php-fpm`才能解决这个问题。

### 注：

1. `Nginx`报错`upstream timed out (110: Connection timed out)` 就是由于`pm.max_requests` 默认值为0，没有重启所引起的。
2.  `php-fpm`子进程假死，就会经常出现`502 Bad Gateway`的错误
3. 打开`.php`的文件总是感觉很慢，Web请求时一直处于`pending`状态。




