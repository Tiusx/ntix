#!/usr/bin/env tsx

/**
 * 生成站点默认分享卡片到 public/og/default.png。
 *
 * 为什么不直接用 app/opengraph-image.tsx 文件约定：
 * 只要页面自己声明了 openGraph（几乎每页都会，为了独立的 og:title / description），
 * 就会屏蔽从祖先继承的文件约定——实测 Next 16 + Turbopack 下，
 * archive / memos 能拿到，home / blog / categories / tags 全部拿不到。
 * 为此在每个段各放一份 opengraph-image.tsx 纯属文件噪音。
 *
 * 改为构建期产出一张静态 PNG，URL 固定，任何页面都能直接引用。
 * 文章的专属卡片仍走文件约定（它与页面同段，因此始终生效）。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OG_SIZE, siteCard } from "../src/lib/og-card";

const OUT_DIR = path.join(process.cwd(), "public", "og");
const OUT_FILE = path.join(OUT_DIR, "default.png");

async function main() {
  const buf = Buffer.from(await siteCard().arrayBuffer());
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, buf);
  console.log(
    `🎨 生成默认分享卡片 public/og/default.png (${OG_SIZE.width}x${OG_SIZE.height}, ${(buf.length / 1024).toFixed(1)} KB)`,
  );
}

main().catch((error) => {
  console.error("💥 生成 OG 卡片失败:", error);
  process.exit(1);
});
