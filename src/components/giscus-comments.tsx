"use client";

import { useEffect, useRef } from "react";

const GISCUS_CONFIG = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO || "",
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "",
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "",
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "",
};

const STORAGE_KEY = "ntix-theme";
const THEME_ATTR = "data-theme";
const DARK_THEME_VALUE = "graphite";
const LIGHT_THEME_VALUE = "nord";

type GiscusTheme = "noborder_light" | "noborder_dark";

function currentGiscusTheme(): GiscusTheme {
  if (typeof window === "undefined") return "noborder_light";
  const attr = document.documentElement.getAttribute(THEME_ATTR);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || attr === DARK_THEME_VALUE) return "noborder_dark";
  if (saved === "light" || attr === LIGHT_THEME_VALUE) return "noborder_light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "noborder_dark"
    : "noborder_light";
}

function pushTheme(theme: GiscusTheme): void {
  window.postMessage({ giscus: { setConfig: { theme } } }, "*");
}

export function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);

  const enabled = Boolean(
    GISCUS_CONFIG.repo &&
      GISCUS_CONFIG.repoId &&
      GISCUS_CONFIG.category &&
      GISCUS_CONFIG.categoryId,
  );

  useEffect(() => {
    if (!enabled) return;
    if (!ref.current) return;
    if (ref.current.querySelector("iframe, script[data-giscus]")) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.giscus = "";
    script.dataset.repo = GISCUS_CONFIG.repo;
    script.dataset.repoId = GISCUS_CONFIG.repoId;
    script.dataset.category = GISCUS_CONFIG.category;
    script.dataset.categoryId = GISCUS_CONFIG.categoryId;
    script.dataset.mapping = "pathname";
    script.dataset.strict = "0";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "0";
    script.dataset.inputPosition = "top";
    script.dataset.theme = currentGiscusTheme();
    script.dataset.lang = "en";
    script.dataset.loading = "lazy";
    ref.current.appendChild(script);

    const onChange = () => pushTheme(currentGiscusTheme());
    window.addEventListener("storage", onChange);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onChange);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === THEME_ATTR) onChange();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [THEME_ATTR],
    });

    return () => {
      window.removeEventListener("storage", onChange);
      media.removeEventListener("change", onChange);
      observer.disconnect();
      script.remove();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className="mt-12 border-t border-line pt-8" />;
}