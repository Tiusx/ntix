"use client";

import { useState } from "react";

/**
 * 友链头像：方形、细描边，和友圈的方头像一致。
 *
 * 头像地址可能失效（ico 过期、防盗链），失败时退回首字方块而不是破图；
 * 干脆没配 avatar 的站点也走这条路。
 */
export function FriendAvatar({
  name,
  avatar,
  size = 40,
}: {
  name: string;
  avatar?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const base = "shrink-0 rounded-[4px] border border-line";
  const style = { width: size, height: size };

  if (!avatar || failed) {
    return (
      <span
        style={style}
        className={`${base} flex items-center justify-center bg-card font-mono text-[13px] text-muted`}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={avatar}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={style}
      className={`${base} object-cover`}
    />
  );
}
