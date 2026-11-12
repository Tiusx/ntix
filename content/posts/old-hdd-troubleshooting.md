---
title: "一块旧硬盘，让主力机卡到重装系统"
slug: "old-hdd-troubleshooting"
date: "2026-11-12"
category: "生活"
tags: ["技术", "系统", "Bios"]
summary: "闲置的希捷酷鱼 1TB 机械硬盘接入主力机后，软件频繁卡死，连系统安装都异常缓慢。记录从怀疑系统、启动盘到拔盘后恢复正常的排查过程。"
status: "Published"
page_id: "41516576-aec8-80cc-93a2-e826f53e8932"
last_edited_time: "2026-11-12T16:06:00.000Z"
---


### 小主机先出了故障


前些天，我连续收到几封异常邮件：部署在 mini 主机上的 Memos 服务无法正常使用。检查后发现，主机里的 Ubuntu 启动失败，开机黑屏，甚至进不了 BIOS。


![325a79a457d28115.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/325a79a457d28115.webp)


拆开主机逐项检查后，我先怀疑是 Ubuntu 系统或固态硬盘出了问题。最后把原来的 SSD 拆下来，主板才恢复正常，能够进入 BIOS。


![bc0bb3d89176f2d2.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/bc0bb3d89176f2d2.webp)


![8e93fcf8b6194c0a.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/8e93fcf8b6194c0a.webp)


我尝试把 FNOS 重新装回原来的 SSD，却无法写入。于是从自用主机里拆下一块淘汰的铭瑄 120GB 固态，装好 FNOS 后，小主机总算恢复了使用。


![383f6cadb1691127.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/383f6cadb1691127.webp)


![893f36c39b82637c.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/893f36c39b82637c.webp)


![0de9bf1ca6410b1a.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/0de9bf1ca6410b1a.webp)


### 主力机也开始不对劲


整理家里淘汰的设备时，我又翻出一块希捷酷鱼 1TB 机械硬盘。想着正好拆着电脑机箱，便把它接到了主力机上，准备给电脑扩容。


![1fab8d07accde2d4.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/1fab8d07accde2d4.webp)


接下来的两天，主力机里的程序陆续出现异常：打开后卡住，或者直接崩溃。我起初怀疑是 WeGame 更新带来的兼容问题，查了资料，也卸载重装了相关应用，但问题依旧。


![1f6a8dc87638bcaf.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/1f6a8dc87638bcaf.webp)


### 排查方向越走越远


我本来就有重装系统的打算，于是下载最新的 Windows 11 镜像，用 Rufus 制作启动 U 盘。开机按 F12 后，电脑能识别 U 盘；选择启动后却一直停在转圈界面，等了十多分钟也没有进展。


![f4b2bd6053ddb5b9.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/f4b2bd6053ddb5b9.webp)


![ac16267abb5d563b.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/ac16267abb5d563b.webp)


换用 Ubuntu 启动盘后，电脑可以正常启动。我一度以为是 Windows 镜像的问题，随后重新制作了 Windows 11 启动盘和微 PE，最终也成功进入微 PE。问题看起来像是系统或启动盘，却始终没有真正解决。


期间，我还更新了主板 BIOS，并调整了安全启动设置，仍然没找到原因。


![8c0f15e38611204c.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/8c0f15e38611204c.webp)


![d11a7c8bc4e48c08.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/d11a7c8bc4e48c08.webp)


![0026ae01243d9d2a.webp](https://r2.tius.cn/posts/41516576-aec8-80cc-93a2-e826f53e8932/0026ae01243d9d2a.webp)


### 拔掉硬盘，问题立刻缓解


进入微 PE 后，我打开 DiskGenius，程序直接卡死，无法关闭。随后使用 WinNTSetup 准备安装系统。重要资料此前已经备份到 FNOS NAS；分区、格式化前，仍要仔细核对目标磁盘，避免误删数据。


等待安装时，我注意到新接入的希捷硬盘一直没有正常识别，DiskGenius 和 WinNTSetup 也都没能顺利处理它。我试着把硬盘拔掉，DiskGenius 随即恢复响应，系统安装速度也恢复正常。


线索终于对上了：主力机的卡顿、磁盘工具失去响应和安装缓慢，都发生在这块旧机械硬盘接入之后；拔掉它后，电脑恢复正常。从现象看，问题很可能出在这块硬盘，而不是 Windows 镜像或启动 U 盘。


### 这次排查的教训


一块闲置硬盘，让我把排查方向带到了应用、系统镜像和 BIOS 上，直接重装系统。以后给电脑接入状态不明的旧硬盘，应该先单独检查；出现异常时，也可以先断开最近新增的设备，再观察问题是否消失。操作分区或格式化前，先备份重要资料，并再次确认目标磁盘。

