import { ImageResponse } from "next/og";
import { SITE_CONFIG } from "@/site.config";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * ⚠️ 所有卡片内的文字必须严格保持纯 ASCII。
 *
 * satori 遇到未覆盖的字形会**自动去 Google Fonts 抓字体**，
 * 离线或受限网络下会直接让构建失败（实测 "Failed to load dynamic font"）。
 * 把中文标题画进图片还需要一份本地 CJK 字体（仅 ttf/otf/woff，15MB+），
 * 而构建机（GitHub Actions / Cloudflare Pages 的 Linux）没有系统中文字体，
 * 提交 15MB 字体进仓库也不可接受。
 *
 * 中文标题由 og:title / og:description 承载——社交平台本来就会把它
 * 显示在图片旁边。换来零新依赖、零构建期网络请求，各环境产出完全一致。
 */

// 与 globals.css 的 graphite 主题保持一致
const C = {
  bg: "#1d2021",
  fg: "#e8e4dc",
  muted: "#8a8378",
  accent: "#efe9db",
};

/** 站点默认卡片：字标 + 域名。 */
export function siteCard(): ImageResponse {
  const host = SITE_CONFIG.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: C.bg,
          color: C.fg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 92,
            letterSpacing: 14,
            color: C.accent,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9999, background: C.accent }} />
          {SITE_CONFIG.title}
        </div>
        <div style={{ height: 2, width: 160, background: C.muted, opacity: 0.45 }} />
        <div style={{ fontSize: 30, color: C.muted, letterSpacing: 4 }}>{host}</div>
      </div>
    ),
    OG_SIZE,
  );
}

/** 文章卡片：字标 + 序号（按时间倒序编号）+ 日期。 */
export function postCard(opts: { serial: number | null; date: string }): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.bg,
          color: C.fg,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: 9999, background: C.accent }} />
          <div style={{ fontSize: 34, letterSpacing: 6, color: C.accent }}>{SITE_CONFIG.title}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ height: 2, width: 120, background: C.muted, opacity: 0.5 }} />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              fontSize: 30,
              color: C.muted,
            }}
          >
            {opts.serial !== null && <div>{String(opts.serial).padStart(3, "0")}</div>}
            {opts.date && <div>{opts.date}</div>}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
