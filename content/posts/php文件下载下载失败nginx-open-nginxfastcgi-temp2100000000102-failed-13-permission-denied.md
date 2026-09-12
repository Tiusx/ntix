---
title: "PHP文件下载，下载失败，Nginx open() nginx/fastcgi_temp/2/10/0000000102“ failed (13: Permission denied)"
slug: "php文件下载下载失败nginx-open-nginxfastcgi-temp2100000000102-failed-13-permission-denied"
date: "2021-07-19"
category: "开发"
status: "Published"
tags: ["技术"]
summary: ""
---

### 概述
在测试服测试项目时出现文件下载失败
![PHP文件下载失败](https://rimg.tius.cn/images/09ee5a3f2249829444bbb829afa640bb6e13c696.png#blurhash=LQQvzZt7%25M%25M%7EWj%5BfRj%5B00ofM%7BWA&width=242&height=63)

### 排查问题
经过排查发现`Nginx`给出报错信息
`open() "/home/server/nginx/fastcgi_temp/2/10/0000000102" failed (13: Permission denied) while reading upstream`
`Nginx`提示我们没有权限操作
![Nginx错误日志](https://rimg.tius.cn/images/3a7cf09eee39910538f5b3e8dc92cfd46bfc6760.png#blurhash=L9ATWUt70fs.%3FGWCEMofRPWBbbjZ&width=1914&height=449)

然后我们进入目录`/home/server/nginx`检查`fastcgi_temp`文件所有者，我们的是`root组的root`用户
![fastcgii所属者](https://rimg.tius.cn/images/cb70ee1c6bc16a5f67f98ed878d9e9b0f19c3404.png#blurhash=L38%3BAJ%7E9E1%25O%7C_-BS%23nhIUR5kWoe&width=620&height=215)

我们再检查`Nginx worker`的用户组及用户名
```shell
ps -ef | grep nginx
# 我们可以看到nginx的worker进程是www用户
root       80246       1  0 10:37 ?        00:00:00 nginx: master process /home/server/nginx/sbin/nginx
www        80247   80246  0 10:37 ?        00:00:00 nginx: worker process
root       82877   82840  0 13:56 pts/7    00:00:00 grep --color=auto nginx
# 查看www用户所在的组,以及组内成员
groups www
#我们的是www用户组的www用户
www:www
```
### 解决问题
我们在执行下载时，`nginx worker` 进程在给`fastcgi_temp`写入缓存时没有权限
因此，我们只需要给`fastcgi_temp`目录修改权限为`nginx`的启动用户`www:www`
```shell
chown -R www:www fastcgi_temp/
```












