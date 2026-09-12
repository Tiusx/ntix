---
title: "记一次：dev 下中文分类 404，Next.js 非 ASCII 参数的坑"
slug: "next-non-ascii-dynamic-param-dev-404"
date: "2026-09-11"
category: "开发"
status: "Published"
tags: ["next","踩坑","国际化"]
summary: "把分类改成中文后，dev 模式点击分类直接抛「missing param」而非正常渲染。排查发现是 Next.js 已知 bug：output: export 下非 ASCII 动态参数在 dev server 里参数编码不匹配。"
---

把博客的分类名从英文改成中文（开发/生活/随笔/读书）后，`pnpm build` 一切正常，中文分类页也正确静态导出了。但一开 `pnpm dev`，点击分类就崩：

```
Page "/(site)/categories/[category]/page" is missing param
"/categories/[category]" in "generateStaticParams()",
which is required with "output: export" config.
```

## 先排除了两个「假」原因

排查时最先怀疑的是我自己写错，但都被排除了：

1. `generateStaticParams()` 返回中文没问题——`next build` 确实生成了
   `out/categories/开发`、`生活`、`随笔`、`读书` 五个目录，生产是好的。
   所以不是参数本身的问题。
2. `article` 前台与元数据的键完全一致，也不是数据不匹配。

## 真正的坑：编码不匹配

问题出在 **dev server 内部对路径的比较方式**。浏览器访问时，URL 里的中文会变成百分号编码：

```
/categories/%E5%BC%80%E5%8F%91/
```

而 `generateStaticParams()` 返回的是**原始中文** `开发`。dev server 用这两者做**严格等值比较**，不相等，于是误报「missing param」。

生产构建（`next build` / `next export`）走的是另一条链路，会正确处理编码，所以它没这个问题。

往上查证，这是 Next.js 的已知 issue：

- Vercel/next.js#92192：Non-ASCII slugs in `generateStaticParams()` with `output: export`
- 修复 PR #92194：Match both encoded/decoded path variants in dev

本机用的 16.3.4 尚未包含这次修复，所以需要自己绕。

## 解决方案：dev 下同时提供编码变体

绕过思路：dev 模式时让 `generateStaticParams()` **同时返回原始值和编码后的值**，这样无论 dev server 比对哪种形式都能命中；生产构建仍只返回原始中文，保持干净的静态导出。

```ts
const RAW_KEYS = Object.keys(CATEGORY_META); // ["开发", "生活", ...]

export function generateStaticParams() {
  const raw = RAW_KEYS.map((category) => ({ category }));

  if (process.env.NODE_ENV === "development") {
    return raw.concat(
      RAW_KEYS.map((category) => ({
        category: encodeURIComponent(category),
      }))
    );
  }
  return raw;
}
```

分支页面里统一用 `decodeURIComponent(params.category)` 还原成原始中文再查文章，这样不管拿到哪种形式都能正确解码。`decodeURIComponent` 对已经是原始中文的输入是幂等安全的（不会报错），所以生产路径也不受影响。

## 验证

改完后：

- `next dev`：直接访问 `/categories/%E5%BC%80%E5%8F%91/` → 200
- `next build` + `next export`：仍正确生成五个中文分类目录 → 通过
- `tsc --noEmit`：无类型错误

## 小结

几个值得记住的点：

1. 生产构建和 dev server 对动态参数的编码处理是**两套逻辑**，能 build 不代表 dev 稳。
2. 中文/emoji 等非 ASCII 值塞进动态路由参数时，务必在 `generateStaticParams` 与页面取值两侧都做一致的编码/解码约定，避免「build 过、dev 炸」的割裂。
3. 遇到「missing param」这种报错，先区分是参数真没生成，还是生成值在某一端被编码后对不上——后者往往要升级框架或加兼容处理。

等 Next.js 更新版本合入 #92194 后，这套 dev 兼容变体可以去掉，只保留原始中文字段即可。