"use client";

import { useSyncExternalStore } from "react";
import { DARK_THEME, LIGHT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

/** layout 的内联脚本会在首屏前把 data-theme 写到 <html> 上，这里以它为准。 */
function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === DARK_THEME ? "dark" : "light";
}

/** 服务端不知道用户偏好，且 layout 固定渲染 LIGHT_THEME。 */
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme === "dark" ? DARK_THEME : LIGHT_THEME;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 隐私模式下 localStorage 可能抛错，忽略即可（本次会话仍生效）
  }
}

export function ThemeToggle() {
  // 用 useSyncExternalStore 而非 useEffect + setState：主题是「外部系统」
  // （<html> 属性 + localStorage），在 effect 体内同步 setState 会触发级联渲染。
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "切换到浅色" : "切换到深色"}
      title={isDark ? "浅色模式" : "深色模式"}
      className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink shadow-lg transition-colors hover:bg-accent hover:text-white"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
