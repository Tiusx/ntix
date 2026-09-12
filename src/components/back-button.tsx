"use client";

import { useRouter } from "next/navigation";

export function BackButton({ label = "← 返回" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="cursor-pointer text-sm text-muted transition-colors hover:text-accent"
    >
      {label}
    </button>
  );
}