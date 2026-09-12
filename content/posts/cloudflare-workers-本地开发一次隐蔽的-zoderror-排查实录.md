---
title: "Cloudflare Workers 本地开发：一次隐蔽的 ZodError 排查实录"
slug: "cloudflare-workers-本地开发一次隐蔽的-zoderror-排查实录"
date: "2026-08-29"
category: "开发"
status: "Published"
tags: ["Cloudflare","Workers","ZodError"]
summary: "`wrangler dev --local` 启动时反复报 `Uncaught Error: ZodError`"
---

> 排障记录 · 关键词：`wrangler dev --local` · `workerd` · `ZodError` · 模块顶层副作用 · `siteConfigSchema.parse({})`

## 一句话结论

`wrangler dev --local` 启动时报 `Uncaught Error: ZodError`，根源是 Worker 源码中一个模块在 **import 时顶层直接执行了 `zod.parse({})`**，而 schema 的嵌套对象字段缺少 `.default({})`，导致 workerd 加载代码瞬间抛错。这是典型的「模块顶层副作用」引发的启动期崩溃。

---

## 问题现象

项目为 Monorepo 中的 Hono Worker（Cloudflare），日常使用 `wrangler dev --local` 启动。某日起，每次启动均稳定报错：

```
✘ [ERROR] service core:user:blog-cms: Uncaught Error: ZodError
    at index.js:9512:24 in get error
    at index.js:9588:18 in parse
    at index.js:13602:44
✘ [ERROR] The Workers runtime failed to start.
```

Worker 无法启动。

---

## 排查过程

### 排除外部因素

先后尝试了以下操作，**均无效**：

- 升级/降级 `wrangler` 版本
- 注释 `[assets]` binding
- 清空 `.wrangler` 缓存目录
- 修改 `wrangler.toml` 中的占位符为合法值

结论：问题不在工具链或配置，**病根在 Worker 源码中**。

### 二分定位

采用最小还原法，逐步恢复 `src/index.ts` 中的 import：

| 还原步骤 | 操作 | 结果 |
|---|---|---|
| 1 | 仅保留 `fetch` 返回 `"ok"` | ✅ 正常启动 |
| 2 | + `import { Hono } from 'hono'` | ✅ 正常启动 |
| 3 | + `import { z } from 'zod'` | ✅ 正常启动 |
| 4 | + `import { drizzle } from 'drizzle-orm/d1'` | ✅ 正常启动 |
| 5 | + `import * as schema from './db/schema'` | ✅ 正常启动 |
| 6 | + `import { loadConfigCached } from './services/config'` | ❌ **ZodError！** |

**病根锁定在 `src/services/config.ts`。**

---

## 病根分析

`config.ts` 顶层存在这样一段代码：

```ts
export const siteConfigSchema = z.object({
  basic: z.object({ siteName: z.string().default('My Blog') }),
  features: z.object({
    comments: z.object({ enabled: z.boolean().default(true) }),   // ← 缺 .default({})
    newsletter: z.object({ enabled: z.boolean().default(false) }), // ← 缺 .default({})
  }),
});

// 🔴 问题所在：模块顶层直接执行 parse
export const DEFAULT_SITE_CONFIG = siteConfigSchema.parse({});
```

问题链条：

1. `parse({})` 是**模块顶层语句**，文件被 `import` 时立即执行。
2. `features` 等对象字段是 `z.object({...})`，**没有 `.default({})`**。
3. 传入空对象 `{}` 时，`features` 字段缺失 → zod 校验失败 → 抛出 `ZodError`。
4. workerd 加载模块时捕获该异常 → 整个 runtime 崩溃。

> 叶子字段（如 `siteName`）虽有 `.default()`，但**对象本身**没有兜底，导致整个对象缺失时报错。

---

## 解决方案

### 最终采用：给嵌套对象补 `.default({})`

```ts
features: z.object({
  comments: z.object({ enabled: z.boolean().default(true) }).default({}),
  newsletter: z.object({ enabled: z.boolean().default(false) }).default({}),
}).default({}),
```

这样「整个对象缺失时用 `{}` 兜底」，叶子字段再各自用 `.default()` 填充初值。

### 备选方案

若不想改 schema，可改顶层调用：

```ts
export const DEFAULT_SITE_CONFIG = siteConfigSchema.parse({
  basic: {},
  features: {},
});
```

但**推荐方案一**，它能根治问题，且在任何「从部分数据反序列化」的场景下同样安全。

---

## 修复后验证

```bash
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8787
```

API 正常返回配置数据，问题解决 ✅

---

## 经验总结

1. **ZodError 不一定是「请求参数校验」的问题**——它也可能来自模块加载阶段的顶层执行。
2. **workerd 的堆栈只告诉你有问题，不告诉你 who 的问题**——具体定位要靠二分法。
3. **警惕模块顶层副作用**：`parse({})`、`new Hono()`、顶层 `await` 等在 `import` 时即执行，一旦抛错 Worker 直接起不来。这类逻辑应尽量懒执行或确保绝对安全。
4. **zod 的 `.default()` 是字段级的**——想让整个对象兜底，必须在对象层也加 `.default({})`。
5. **二分法永远是定位问题的银弹**：一次只改一个变量，快速收敛到触发点，省去无数瞎猜。
