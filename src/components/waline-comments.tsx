"use client";

import { useEffect, useRef } from "react";
import { init, type WalineInitOptions } from "@waline/client";
import "@waline/client/waline.css";

const SERVER_URL = "https://waline.tius.cn";

export function WalineComments({ path }: { path: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SERVER_URL) return;
    if (!ref.current) return;

    const options: WalineInitOptions = {
      el: ref.current,
      serverURL: SERVER_URL,
      path,
      lang: "zh-CN",
      dark: "auto",
    };

    let instance: ReturnType<typeof init> | undefined;
    try {
      instance = init(options);
    } catch (error) {
      console.error("Waline init failed:", error);
    }

    return () => instance?.destroy();
  }, [path]);

  if (!SERVER_URL) return null;
  return <div ref={ref} className="mt-12 border-t border-line pt-8" />;
}