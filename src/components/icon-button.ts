/**
 * 顶部工具区的唯一按钮形态。
 *
 * 搜索、RSS、主题三个入口共用同一套尺寸与描边。改之前是三种形态挤在一行：
 * 搜索 = 图标 + 文字 + 一个方形的 `/` 快捷键块，RSS = 纯文字链接，
 * 主题 = 右下角漂着的圆钮。
 */
export const ICON_BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent";
