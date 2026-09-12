---
title: "PHP Yaf(Yet Another Framework) 扩展及框架部署"
slug: "php-yafyet-another-framework-扩展及框架部署"
date: "2021-04-07"
category: "开发"
status: "Published"
tags: ["技术","Yaf"]
summary: "PHP Yaf(Yet Another Framework) 扩展及框架部署"
---

> ###### 查看本机配置

终端输入命令`php -v`
```shell
$ php -v
PHP 7.4.3 (cli) (built: Feb 18 2020 17:29:57) ( NTS Visual C++ 2017 x64 )
Copyright (c) The PHP Group
Zend Engine v3.4.0, Copyright (c) Zend Technologies
```
```
本机环境：windows10 PHPstudy PHP7.4.3 NTS + Nginx1.15
```

> ###### 先附上链接地址懒得找

- yaf 扩展下载地址：https://pecl.php.net/package/yaf
- yaf github项目地址 : https://github.com/laruence/yaf
- yaf 框架文档：https://www.laruence.com/manual/
- yaf 扩展文档:https://www.php.net/manual/zh/book.yaf.php

> ###### 下载yaf

要使用yaf首先要开启PHP的yaf扩展官网下载

一，选择对应版本，楼主用的PHP7.4所以下载的最新版本3.3.2
![image.png](https://rimg.tius.cn/images/1ea07cee31bb3ff0a2255f78f8ecc9edf66f19b9.png#blurhash=LSO43ooft7xuN3WCWBRj02WCayWB&width=1618&height=804)

二，通过phpinfo()选择NTS 还是TS的版本，以及X86或者X64
![image.png](https://rimg.tius.cn/images/94546162e593e61c47cf9fd5ef1b0093f080929b.png#blurhash=LCNm%2B%3DDyok%25dIdt7t6a%23D*x%3Aotj%5E&width=987&height=857)
三，disable线程非安全选择：
![image.png](https://rimg.tius.cn/images/8180fd12b5906bd698225e9b28b70acb2b5c35a0.png#blurhash=LTOgHLWCxu-p02juWBWBD%2CofRQM%7C&width=1321&height=800)

> ###### 加载yaf扩展

将下载完的`yaf扩展`解压，把里面的 `php_yaf.dll` 移到对应的php版本的ext目录下

```
 如： D:\phpstudy_pro\Extensions\php\php7.4.3nts\ext
```

> ###### 修改php.ini

在对应PHP版本的`php.ini` 加入yaf扩展，保存并重启服务器
```shell
extension=php_yaf.dll
```

> ###### 检查模块是否加载成功

终端输入命令`php -m`，看到yaf说明就已经配置成功
```shell
$ php -m

[PHP Modules]
......  
yaf
......

[Zend Modules]
```
> ###### 编译yaf demo

yaf项目地址 : https://github.com/laruence/yaf
clone下项目
cd 进`yaf/tools/cg`目录，通过`yaf_cg`工具新建一个test项目

```shell
git clone https://github.com/laruence/yaf.git yaf
cd /yaf/tools/cg
php yaf_cg -d test

#看到输出done则已成功了
```

![image.png](https://rimg.tius.cn/images/df7375fa63eb4aead9f4770a238a2378089a055b.png#blurhash=L16*aW%3FuNZ%5EiIm%251xaR%25KbEKJSOT&width=589&height=282)

将`yaf_cg`工具生成的`test`目录复制到根目录，然后启动：`Nginx`，到了这一步我们的框架已经生成好了

> ###### 目录结构


```json
+ public
  |- index.php //入口文件
  |- .htaccess //重写规则    
  |+ css
  |+ img
  |+ js
+ conf
  |- application.ini //配置文件   
+ application
  |+ controllers
     |- Index.php //默认控制器
  |+ views    
     |+ index   //控制器
        |- index.phtml //默认视图
  |+ modules //其他模块
  |+ library //本地类库
  |+ models  //model目录
  |+ plugins //插件目录

```
