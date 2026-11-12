---
title: "WinNTSetup 创建 ESP 分区并配置引导"
slug: "winntsetup-create-esp-partition"
date: "2026-11-10"
category: "开发"
tags: ["系统", "Bios", "技术"]
summary: "使用 DiskGenius 创建 ESP/MSR 分区并为 ESP 分配盘符，再在 WinNTSetup 中设置引导驱动器、选择 FAT32，并确认 EFI 指示灯为绿色后安装系统。"
status: "Published"
page_id: "41516576-aec8-8003-9236-d8d9f0a9c26c"
last_edited_time: "2026-11-12T16:06:00.000Z"
---


## 操作步骤

1. 使用 DiskGenius 创建 ESP/MSR 分区，并将 ESP 分区大小设为 100 MB。
2. 为 ESP 分区分配盘符。
3. 打开 WinNTSetup，设置引导驱动器为刚分配的 ESP 盘符，并选择 FAT32 格式。
4. 确认 EFI 指示灯为绿色后，开始安装系统。

![0026ae01243d9d2a.webp](https://r2.tius.cn/posts/41516576-aec8-8003-9236-d8d9f0a9c26c/0026ae01243d9d2a.webp)

