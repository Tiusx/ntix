"use client";

import { useEffect, useState } from "react";
import { DARK_THEME, LIGHT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initial: Theme =
      saved === "light" || saved === "dark"
        ? saved
        : systemDark
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial === "dark"
      ? DARK_THEME
      : LIGHT_THEME;
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme =
      theme === "dark" ? DARK_THEME : LIGHT_THEME;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

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
          <path d="M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}