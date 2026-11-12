#!/usr/bin/env tsx

/**
 * 一次性维护脚本：把图床上历史遗留的原始 HEIC 按「当前」编码参数重跑，
 * 替换文章里那批按旧参数（q82）压过的 WebP。
 *
 * 为什么需要它：HEIC 支持上线前的图片是按 q82 压的，改环境变量不会追溯生效；
 * 而这些 HEIC 原件仍留在 R2 上（当时成了孤儿对象），是唯一还能提质量的信源。
 * 其余老图的原始文件已不存在，重编码只会更糊，所以不在本脚本处理范围内。
 *
 * 映射方式不做任何位置猜测：旧 WebP 的 key 是 sha1(编码结果) 前 16 位，
 * 用「旧参数」重新编码即可精确复算出它对应的 key，再拿这个 key 去 Notion 块
 * 与本地 markdown 里定位。命中即证明映射正确；不命中就跳过，绝不猜。
 *
 * 用法：
 *   pnpm reencode:heic --dry-run          # 只打印映射与体积对比，不写任何东西
 *   pnpm reencode:heic                    # 上传新图，回写 Notion 块与本地 markdown
 *   pnpm reencode:heic --delete-orphans   # 迁移成功后再删掉 R2 上的 .heic 原件
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Client, BlockObjectResponse } from "@notionhq/client";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import decodeHeic from "heic-decode";
import { getImageOptions, isHeic } from "./notion/image-optimizer";
import { loadEnv } from "./notion/utils";
import { is404 } from "./notion/r2-uploader";
import { isTransientHttpError, withRetry } from "./lib/retry";
import { r2Bucket, r2PublicDomain } from "./lib/asset-url";

loadEnv();

/** 旧管线参数：长边 2560 + q82，且没有 smartSubsample——复算 key 必须逐字对齐。 */
const LEGACY_MAX_WIDTH = 2560;
const LEGACY_QUALITY = 82;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DELETE_ORPHANS = args.includes("--delete-orphans");

const CONTENT_DIR = path.join(process.cwd(), "content/posts");

interface HeicObject {
  key: string;
  pageId: string;
  size: number;
}

interface Migration {
  heic: HeicObject;
  oldKey: string;
  newKey: string;
  newSize: number;
  oldSize: number;
  blockId: string | null;
  matchedIn: "notion" | "markdown" | "none";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量 ${name}`);
  return v;
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

const notion = new Client({ auth: requireEnv("NOTION_API_SECRET") });

const keyHash = (buffer: Buffer): string =>
  createHash("sha1").update(buffer).digest("hex").slice(0, 16);

/** 列举 posts/ 下的 .heic 对象（按 pageId 分组用的前缀就藏在 key 里）。 */
async function listHeicObjects(): Promise<HeicObject[]> {
  const out: HeicObject[] = [];
  let token: string | undefined;
  do {
    const res = await withRetry(
      () =>
        s3.send(
          new ListObjectsV2Command({
            Bucket: r2Bucket(),
            Prefix: "posts/",
            ContinuationToken: token,
          }),
        ),
      { label: "list R2 objects" },
    );
    for (const item of res.Contents ?? []) {
      if (!item.Key || !item.Key.toLowerCase().endsWith(".heic")) continue;
      const [, pageId] = item.Key.split("/");
      out.push({ key: item.Key, pageId, size: item.Size ?? 0 });
    }
    token = res.NextContinuationToken;
  } while (token);
  return out;
}

async function download(key: string): Promise<Buffer> {
  const res = await withRetry(
    () => s3.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key })),
    { label: `download ${key}` },
  );
  return Buffer.from(await res.Body!.transformToByteArray());
}

/** 旧参数编码，用于复算「这张 HEIC 当初被转成了哪个 WebP key」。 */
async function encodeLegacy(raw: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .resize({
      width: LEGACY_MAX_WIDTH,
      height: LEGACY_MAX_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: LEGACY_QUALITY })
    .toBuffer();
}

/** 当前参数编码（读 R2_IMAGE_* 环境变量）。 */
async function encodeCurrent(raw: Buffer, width: number, height: number): Promise<Buffer> {
  const options = getImageOptions();
  let pipeline = sharp(raw, { raw: { width, height, channels: 4 } });
  if (options.maxWidth > 0) {
    pipeline = pipeline.resize({
      width: options.maxWidth,
      height: options.maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  return options.lossless
    ? pipeline.webp({ lossless: true }).toBuffer()
    : pipeline.webp({ quality: options.quality, smartSubsample: true }).toBuffer();
}

/** 递归收集页面内的图片块（含子块），返回 blockId → url。 */
async function collectImageBlocks(
  pageId: string,
  out: Map<string, string> = new Map(),
  blockId = pageId,
  depth = 0,
): Promise<Map<string, string>> {
  if (depth > 5) return out;
  let cursor: string | undefined;
  do {
    const res = await withRetry(
      () =>
        notion.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
          page_size: 100,
        }),
      { label: `list blocks ${blockId}` },
    );
    for (const block of res.results as BlockObjectResponse[]) {
      if (block.type === "image") {
        const url =
          block.image.type === "external" ? block.image.external.url : block.image.file.url;
        out.set(block.id, url);
      }
      if (block.has_children) await collectImageBlocks(pageId, out, block.id, depth + 1);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return out;
}

function readLocalMarkdown(): Map<string, string> {
  const files = new Map<string, string>();
  for (const name of fs.readdirSync(CONTENT_DIR)) {
    if (!name.endsWith(".md")) continue;
    files.set(name, fs.readFileSync(path.join(CONTENT_DIR, name), "utf8"));
  }
  return files;
}

async function uploadIfAbsent(key: string, buffer: Buffer): Promise<void> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    console.log(`   ⏭️  已存在，跳过上传: ${key}`);
    return;
  } catch (error) {
    if (!is404(error)) throw error;
  }
  await withRetry(
    () =>
      s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket(),
          Key: key,
          Body: buffer,
          ContentType: "image/webp",
        }),
      ),
    {
      attempts: 3,
      isRetryable: (e) => isTransientHttpError(e) || typeof (e as { status?: unknown })?.status !== "number",
      label: `upload ${key}`,
    },
  );
  console.log(`   📤 已上传: ${key}`);
}

async function main() {
  const options = getImageOptions();
  console.log(
    `🎛️  当前编码参数: maxWidth=${options.maxWidth || "原尺寸"} quality=${options.quality} lossless=${options.lossless}`,
  );
  if (DRY_RUN) console.log("🔍 DRY RUN — 不写 R2、不改 Notion、不动本地文件");

  const heics = await listHeicObjects();
  console.log(`🔎 发现 ${heics.length} 个 .heic 对象`);

  const markdown = readLocalMarkdown();
  const blockCache = new Map<string, Map<string, string>>();
  const migrations: Migration[] = [];

  for (const heic of heics) {
    const buffer = await download(heic.key);
    if (!isHeic(buffer)) {
      console.warn(`⚠️  ${heic.key} 不是 HEIC（魔数不符），跳过`);
      continue;
    }

    const { width, height, data } = await decodeHeic({ buffer });
    const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

    const legacy = await encodeLegacy(raw, width, height);
    const oldKey = `posts/${heic.pageId}/${keyHash(legacy)}.webp`;

    // 定位：优先 Notion 块（真实信源），miss 再退回本地 markdown
    if (!blockCache.has(heic.pageId)) {
      try {
        blockCache.set(heic.pageId, await collectImageBlocks(heic.pageId));
      } catch (error) {
        // 页面被删/未共享给集成时不必中断整批，退回本地 markdown 判断
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;
        console.warn(`⚠️  页面 ${heic.pageId} 在 Notion 中不可访问，改用本地 markdown 定位`);
        blockCache.set(heic.pageId, new Map());
      }
    }
    const blocks = blockCache.get(heic.pageId)!;
    let blockId: string | null = null;
    for (const [id, url] of blocks) {
      if (url.includes(oldKey)) {
        blockId = id;
        break;
      }
    }
    const inMarkdown = [...markdown.values()].some((text) => text.includes(oldKey));
    const matchedIn = blockId ? "notion" : inMarkdown ? "markdown" : "none";

    if (matchedIn === "none") {
      console.log(`❔ 无法定位旧图，跳过: ${heic.key} → ${oldKey}`);
      continue;
    }

    const current = await encodeCurrent(raw, width, height);
    const newKey = `posts/${heic.pageId}/${keyHash(current)}.webp`;

    migrations.push({
      heic,
      oldKey,
      newKey,
      newSize: current.length,
      oldSize: legacy.length,
      blockId,
      matchedIn,
    });

    const mb = (n: number) => (n / 1024 / 1024).toFixed(2) + "MB";
    const kb = (n: number) => (n / 1024).toFixed(0) + "KB";
    console.log(
      `\n🖼  ${heic.key}\n   ${width}x${height}  原件 ${mb(heic.size)}  q82 ${kb(legacy.length)} → q${options.lossless ? "无损" : options.quality} ${kb(current.length)}  [${matchedIn}]`,
    );

    if (DRY_RUN) {
      console.log(`   → 将写入 ${newKey}`);
      console.log(`   → 将回写块 ${blockId ?? "(仅本地 markdown)"}`);
      continue;
    }

    await uploadIfAbsent(newKey, current);

    const newUrl = `${r2PublicDomain()}/${newKey}`;
    if (blockId) {
      await withRetry(
        () =>
          notion.blocks.update({
            block_id: blockId,
            image: { external: { url: newUrl } },
          }),
        { label: `update block ${blockId}` },
      );
      console.log(`   📝 Notion 块已更新 → ${newUrl}`);
    }
  }

  // 本地 markdown 同步替换，免得为了看图再跑一次全量同步
  if (!DRY_RUN) {
    let patchedFiles = 0;
    for (const [name, text] of markdown) {
      let next = text;
      for (const m of migrations) next = next.split(m.oldKey).join(m.newKey);
      if (next !== text) {
        fs.writeFileSync(path.join(CONTENT_DIR, name), next, "utf-8");
        patchedFiles++;
        console.log(`   ✏️  已更新本地文件: content/posts/${name}`);
      }
    }
    console.log(`\n📄 本地 markdown 更新 ${patchedFiles} 个文件`);
  }

  // 孤儿清理：只删「已成功迁移」的原件，且必须显式加 --delete-orphans
  const migrated = migrations.filter((m) => m.matchedIn === "notion");
  if (DELETE_ORPHANS) {
    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN — 将删除 ${migrated.length} 个 .heic 原件`);
    } else {
      console.log(`\n🧹 删除已迁移的 ${migrated.length} 个 .heic 原件`);
      for (const m of migrated) {
        await withRetry(
          () => s3.send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: m.heic.key })),
          { label: `delete ${m.heic.key}` },
        );
        console.log(`   🗑  ${m.heic.key}`);
      }
    }
  }

  const totalOld = migrations.reduce((s, m) => s + m.oldSize, 0);
  const totalNew = migrations.reduce((s, m) => s + m.newSize, 0);
  const totalHeic = migrations.reduce((s, m) => s + m.heic.size, 0);
  console.log(
    `\n🎉 完成：迁移 ${migrations.length} 张，没定位到 ${heics.length - migrations.length} 张`,
  );
  console.log(
    `   体积：HEIC 原件 ${(totalHeic / 1024 / 1024).toFixed(2)}MB → 旧 q82 ${(totalOld / 1024).toFixed(0)}KB → 新 ${(totalNew / 1024).toFixed(0)}KB`,
  );
  if (!DELETE_ORPHANS) {
    console.log("   💡 加 --delete-orphans 可删除已迁移的 .heic 原件");
  }
}

main().catch((error) => {
  console.error("💥 脚本失败:", error);
  process.exit(1);
});
