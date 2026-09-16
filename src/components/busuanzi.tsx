"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function BusuanziCounter() {
  const pathname = usePathname();
  const retryRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const fetchStats = useCallback(() => {
    if (typeof window === "undefined") return;

    cleanupRef.current?.();

    const callbackName = `BusuanziCallback_${Math.floor(1099511627776 * Math.random())}`;
    let script: HTMLScriptElement | null = null;

    const cleanup = () => {
      delete window[callbackName];
      script?.remove();
      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;

    window[callbackName] = (data: { site_pv?: string; site_uv?: string }) => {
      const setVal = (id: string, v?: string) => {
        const el = document.getElementById(id);
        if (el && v) el.textContent = v;
      };
      setVal("busuanzi_value_site_pv", data.site_pv);
      setVal("busuanzi_value_site_uv", data.site_uv);
      attemptRef.current = 0;
      cleanup();
    };

    script = document.createElement("script");
    script.type = "text/javascript";
    script.defer = true;
    script.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      attemptRef.current += 1;
      if (attemptRef.current < 3) {
        retryRef.current = window.setTimeout(fetchStats, 5000);
      }
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    attemptRef.current = 0;
    const timer = window.setTimeout(fetchStats, 100);

    return () => {
      window.clearTimeout(timer);
      if (retryRef.current) window.clearTimeout(retryRef.current);
      cleanupRef.current?.();
    };
  }, [fetchStats, pathname]);

  return null;
}