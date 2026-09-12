"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BackToPostsLink() {
  const [href, setHref] = useState("/blog/");

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    const page = from ? Number(from) : NaN;
    setHref(Number.isInteger(page) && page > 1 ? `/blog/${page}/` : "/blog/");
  }, []);

  return (
    <Link
      href={href}
      className="text-sm text-muted transition-colors hover:text-accent"
    >
      ← 文章列表
    </Link>
  );
}