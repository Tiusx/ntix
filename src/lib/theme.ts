/**
 * 主题相关的共享常量。
 * 独立成模块是因为 global-not-found.tsx 需要在首屏前用内联脚本应用同一套
 * 主题，而它不能依赖 root layout 或任何 client 组件。
 */

/** localStorage 键名，保存 "light" | "dark" */
export const THEME_STORAGE_KEY = "ntix-theme";

/** 浅色主题对应 globals.css 中的 data-theme 值 */
export const LIGHT_THEME = "nord";

/** 深色主题对应 globals.css 中的 data-theme 值 */
export const DARK_THEME = "graphite";

/**
 * 首屏前同步应用主题，避免刷新时闪一下默认配色。
 * 必须在 <head> 内以内联脚本形式同步执行——若改为外部脚本或 defer，
 * 浏览器会先完成绘制，从而产生闪烁（FOUC）。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="light"||s==="dark")?s:(d?"dark":"light");document.documentElement.dataset.theme=t==="dark"?${JSON.stringify(DARK_THEME)}:${JSON.stringify(LIGHT_THEME)};}catch(e){}})();`;
