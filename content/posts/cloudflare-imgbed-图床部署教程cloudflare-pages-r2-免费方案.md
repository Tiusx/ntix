---
title: "CloudFlare-ImgBed 图床部署教程：Cloudflare Pages + R2 免费方案"
slug: "cloudflare-imgbed-图床部署教程cloudflare-pages-r2-免费方案"
date: "2026-08-19"
category: "开发"
tags: ["图床", "Serverless"]
summary: "使用 Cloudflare Pages + R2 免费搭建个人图床，支持图片上传管理、API 接口和 WebDAV，全托管于 Cloudflare 全球边缘网络，零成本运行。"
status: "Published"
page_id: "3dd16576-aec8-81bf-99d8-eb175cc86e3f"
last_edited_time: "2026-09-16T17:51:00.000Z"
---

> 
>
> 使用 Cloudflare Pages + R2 托管，每月成本 ¥0，预计耗时 30-45 分钟。
>
>

### 免费额度


| 资源              | 免费额度                 |
| --------------- | -------------------- |
| R2 存储           | 10 GB                |
| R2 写入 / 读取      | 100 万次 / 1000 万次     |
| R2 出站流量         | 无限免费                 |
| Pages Functions | 10 万次/天              |
| Workers KV      | 10 万次读/天 + 1000 次写/天 |


### 一、前置准备

- 一个邮箱（注册 Cloudflare 和 GitHub）
- 一张境外付款卡（Visa / Mastercard / PayPal，**银联不行**）
- 一个域名（可选，没有则用 `*.pages.dev` 免费域名）

### 二、注册 Cloudflare 并添加域名

1. 打开 `https://dash.cloudflare.com/sign-up`，注册并验证邮箱
2. 如需自定义域名（如 `img.tius.cn`）：添加根域名站点 → 选 Free 计划 → 复制 NS 服务器到域名注册商修改 → 等待生效
3. 绑定支付方式：头像 → Billing → Payment Info → 添加信用卡或 PayPal
> 
>
> ⚠️ 绑卡 ≠ 扣钱，仅在超出免费额度时才扣费。
>
>

### 三、开通 R2 并创建存储桶

1. 控制台左侧 → **R2 对象存储** → 首次需点击 **启用 R2**
2. 点 **创建存储桶**：名称填 `cf-imgbed`，位置选亚太地区 (APAC)，存储类选标准
3. 创建完成，暂时不动，后面再绑定

### 四、Fork 项目


打开 `https://github.com/MarSeventh/CloudFlare-ImgBed` → 右上角 **Fork** → **Create fork** → 自动跳转到你的仓库


### 五、创建 Cloudflare Pages 项目


**进入创建流程：** 控制台 → 计算 → Workers 和 Pages → 创建应用程序 → ⚠️ 翻到页面最底部，点 **"想要部署 Pages? 开始使用"**


**连接 GitHub：** 选 GitHub → 连接 GitHub → 授权时选 Only select repositories → 勾选 CloudFlare-ImgBed → Install & Authorize → 回到 Cloudflare 点开始设置


**配置构建参数（最关键）：**


| 配置项    | 填写内容                |
| ------ | ------------------- |
| 项目名称   | `cf-imgbed`         |
| 生产分支   | `main`              |
| 框架预设   | **None**            |
| 构建命令   | **`npm install`**   |
| 构建输出目录 | **`frontend-dist`** |

> 
>
> ⚠️ 构建命令必须是 `npm install`（不是 `npm run build`），输出目录必须是 `frontend-dist`。
>
>

填完点 **保存并部署**，等 2-5 分钟。首次部署后先别访问，KV 和 R2 还没绑定。


### 六、创建并绑定 KV

1. 控制台 → 存储和数据库 → Workers KV → **+ Create Instance** → 名称填 `img_url` → 创建
2. Workers 和 Pages → 点开 `cf-imgbed` → 设置 → 绑定 → + 添加 → KV 命名空间
3. 变量名称填 `img_url`，命名空间选 `img_url` → 保存

### 七、绑定 R2 存储桶


同一绑定页面 → + 添加 → R2 存储桶 → 变量名称填 `img_r2`，存储桶选 `cf-imgbed` → 保存


绑定完成后应显示：


| 类型      | 名称        | 值           |
| ------- | --------- | ----------- |
| KV 命名空间 | `img_url` | `img_url`   |
| R2 存储桶  | `img_r2`  | `cf-imgbed` |


### 八、重新部署使绑定生效


项目 → 部署标签 → 最新记录 → ... → **重试部署** → 等 1-3 分钟 → 看到 `Success` 即成功


### 九、初始化图床后台


**访问：** `https://cf-imgbed.pages.dev/dashboard`


**设置密码（必须立刻做）：** 安全设置 → 管理端认证 → 设置用户名和强密码 → 保存 → 用新账密重新登录


**启用 R2 上传渠道：** 上传设置 → CloudFlare R2 → 确保 `R2_env` 开关为蓝色 → 保存


**创建 API Token（可选）：** 安全设置 → API Token 管理 → + → 创建后立刻复制保存（只显示一次）


### 十、测试上传

1. 打开 `https://cf-imgbed.pages.dev`
2. 拖拽或点击上传图片
3. 成功后显示 4 种格式链接（URL / Markdown / HTML / BBCode）
4. 复制 URL 在新标签打开，能看到图就成功了 ✅
5. 回到 R2 控制台，`cf-imgbed` 桶里应能看到刚上传的文件
