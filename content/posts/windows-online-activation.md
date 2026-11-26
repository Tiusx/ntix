---
title: "在线激活Windows"
slug: "windows-online-activation"
date: "2026-11-26"
category: "开发"
tags: ["系统", "技术", "Windows"]
summary: "记录一次 Windows 激活求助经历，并整理在线激活工具的选项与操作记录。"
status: "Published"
page_id: "42416576-aec8-80d6-9c09-ddb1ed4642a9"
last_edited_time: "2026-11-26T15:17:00.000Z"
---


今天群里有人说电脑没激活，不知道怎么激活，然后就去找豆包了，豆包让他买正版激活码激活，我让他等我回来开电脑给他弄，特此记录一下，方便以后查找指令


```javascript
irm https://get.activated.win | iex
```


![c78542745ca0b82a.webp](https://r2.tius.cn/posts/42416576-aec8-80d6-9c09-ddb1ed4642a9/c78542745ca0b82a.webp)


```javascript
Activation Methods: 激活方法

 [1] HWID        |  Windows             |   Permanent 永久
 [2] Ohook       |  Office              |   Permanent 永久
 [3] TSforge     |  Windows/Office/ESU  |   Permanent 永久
 [4] KMS38       |  Windows             |   Year 2038 到2038年
 [5] Online KMS  |  Windows / Office    |   180 Days 180天
 __________________________________________________

 [6] Check Activation Status 检查激活状态
 [7] Change Windows Edition 改Windows版本
 [8] Change Office Edition 改Office版本
 __________________________________________________

 [9] Troubleshoot 疑难排解
 [E] Extras 附加选项
 [H] Help 帮助
 [0] Exit 退出
 ______________________________________________________

      用键盘输入选择项，方括号中为可选项 [1,2,3,4,5,6,7,8,9,E,H,0] :
      
      
按1（数字许可证激活，HWID方式，永久激活Windows）
```


![5853f0af13b6afec.webp](https://r2.tius.cn/posts/42416576-aec8-80d6-9c09-ddb1ed4642a9/5853f0af13b6afec.webp)

