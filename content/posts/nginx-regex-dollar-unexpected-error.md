---
title: "Nginx配置正则中$符号处理不当触发nginx‑t语法报错"
slug: "nginx-regex-dollar-unexpected-error"
date: "2019-12-06"
category: "开发"
tags: ["Nginx", "正则表达式"]
summary: "Nginx配置双引号内正则$符号未转义，执行nginx‑t报unexpected \"$\"错误的原因与三种修复方式。"
status: "Published"
page_id: "3dd16576-aec8-81f2-8c9b-f8d0970f522e"
last_edited_time: "2026-09-16T17:52:00.000Z"
---


## 适用环境

- Nginx 1.14 ~ 1.20
- 使用 `location ~` 正则匹配URI结尾

## 问题现象


配置片段：


```plain text
location ~ "index\.sh"$ {
    ...
}
```


执行配置校验：


```bash
nginx -t
```


报错信息：


```plain text
nginx: [emerg] unexpected "$" in /usr/local/nginx/conf/nginx.conf:19
```


## 排查过程

1. 标准正则语法中 `$` 代表字符串结尾，语法本身没有错误。
2. 将双引号改为单引号：`location ~ 'index\.sh'$`，校验正常通过。
3. Nginx配置语法：**双引号会开启变量插值解析，单引号不会**。

## 根本原因


Nginx配置中双引号包裹的字符串会解析 `$` 变量，例如 `$host`、`$uri`。
当双引号内写 `"index\.sh"$`，`$` 后面紧跟结束引号，Nginx识别为非法变量名，抛出 `unexpected "$"` 语法错误。


## 解决方案


### 方案一：使用单引号（推荐）


```plain text
location ~ 'index\.sh$' {
    ...
}
```


单引号不会解析变量，`$` 直接当作正则元字符。


### 方案二：双引号内转义 $ 符号


```plain text
location ~ "index\.sh\$" {
    ...
}
```


### 方案三：省略引号（正则无空格时可用）


```plain text
location ~ index\.sh$ {
    ...
}
```


## 延伸说明


在 `rewrite` 规则替换字符串中，如果要输出字面量 `$`，同样需要 `\$` 转义；如果要使用 Nginx内置变量，则保持原样。

