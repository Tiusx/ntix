"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 跳转页的客户端部分。
 * meta refresh 已经能覆盖绝大多数情况，这里用 replace 而非 push，
 * 避免跳转目标被留在浏览器历史里（用户按返回会又被弹回来）。
 */
export function RedirectClient({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setTimeout(() => router.replace(to), 100);
    return () => window.clearTimeout(id);
  }, [router, to]);
  return null;
}
