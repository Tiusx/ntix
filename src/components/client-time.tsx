"use client";

import { useSyncExternalStore } from "react";

function formatDateFallback(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("month")} ${get("day")}, ${get("year")} ${get("hour")}:${get("minute")}`;
  } catch {
    return formatDateFallback(iso);
  }
}

/**
 * 客户端本地时区时间。
 *
 * 服务端无法得知访问者时区，因此 SSR 用确定性的 fallback 首屏渲染，
 * 挂载后再切换为本地时区格式。用 useSyncExternalStore 而非
 * useEffect + setState：后者会在 effect 体内同步 setState 触发级联渲染，
 * 且需要 suppressHydrationWarning 才能压掉不一致。
 */
export function ClientTime({ iso }: { iso: string }) {
  const display = useSyncExternalStore(
    // 该值不会「变化」，空订阅即可
    () => () => {},
    () => formatAbsoluteDate(iso),
    () => formatDateFallback(iso),
  );
  return (
    <time className="text-sub" dateTime={iso} suppressHydrationWarning>
      {display}
    </time>
  );
}
