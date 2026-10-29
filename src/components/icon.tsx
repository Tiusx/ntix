import type { SVGProps } from "react";

/**
 * 内联 SVG 图标集。
 *
 * 此前全站用 cdnjs 上的 Font Awesome 6.5.2 全量 CSS：一条 render-blocking 的
 * 跨域样式表 + 若干字体文件，只为了十来个图标，而且大陆访问 cdnjs 并不稳定。
 * 站点实际只用到「线性图标 + 两个品牌标」，内联 SVG 的代价接近于零。
 *
 * 统一 24×24 视框、currentColor 描边，尺寸由 size 控制，颜色跟随文字。
 */
export type IconName =
  | "github"
  | "bilibili"
  | "mail"
  | "rss"
  | "feather"
  | "quote"
  | "play"
  | "pause"
  | "download"
  | "external"
  | "location"
  | "search"
  | "arrow-left"
  | "arrow-right"
  | "file-text"
  | "file-image"
  | "file-video"
  | "file-audio";

const PATHS: Record<IconName, { d: string; filled?: boolean }[]> = {
  github: [
    {
      d: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.5 9.5 0 0 1 12 6.8c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
      filled: true,
    },
  ],
  bilibili: [
    { d: "M6.5 4 4 6.5h16L17.5 4" },
    { d: "M4 6.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" },
    { d: "M8.5 11v3M15.5 11v3M9.5 16.5c.9.8 4.1.8 5 0" },
  ],
  mail: [
    { d: "M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" },
    { d: "m3.5 6.5 8.5 6 8.5-6" },
  ],
  rss: [
    { d: "M4.5 18.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z", filled: true },
    { d: "M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15" },
  ],
  feather: [
    { d: "M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5Z" },
    { d: "M16 8 2 22M17.5 15H9" },
  ],
  quote: [
    {
      d: "M9 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2H5v2h1a4 4 0 0 0 4-4V8a1 1 0 0 0-1-1Zm10 0h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2h-1v2h1a4 4 0 0 0 4-4V8a1 1 0 0 0-1-1Z",
      filled: true,
    },
  ],
  play: [{ d: "M8 5.5v13l11-6.5z", filled: true }],
  pause: [
    { d: "M6 4h4v16H6zM14 4h4v16h-4z", filled: true },
  ],
  download: [
    { d: "M12 3v12" },
    { d: "m8 11 4 4 4-4" },
    { d: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" },
  ],
  external: [
    { d: "M14 4h6v6" },
    { d: "M20 4 11 13" },
    { d: "M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" },
  ],
  location: [
    { d: "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" },
    { d: "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" },
  ],
  "file-text": [
    { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" },
    { d: "M14 3v5h5M9 13h6M9 17h6" },
  ],
  search: [
    { d: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" },
    { d: "m20 20-4.2-4.2" },
  ],
  "arrow-left": [{ d: "M19 12H5m0 0 6-6m-6 6 6 6" }],
  "arrow-right": [{ d: "M5 12h14m0 0-6-6m6 6-6 6" }],
  "file-image": [
    { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" },
    { d: "M14 3v5h5" },
    { d: "m8 17 3-3 2 2 1.5-1.5L17 17" },
  ],
  "file-video": [
    { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" },
    { d: "M14 3v5h5" },
    { d: "m10 12 5 3-5 3z", filled: true },
  ],
  "file-audio": [
    { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" },
    { d: "M14 3v5h5" },
    { d: "M9 17v-3M12 17v-6M15 17v-4" },
  ],
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** 边长（px），默认 16 */
  size?: number;
}

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const shapes = PATHS[name];
  const filled = shapes.every((shape) => shape.filled);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...(filled
        ? { fill: "currentColor" }
        : {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.8,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          })}
      {...rest}
    >
      {shapes.map((shape, index) =>
        shape.filled ? (
          <path key={index} d={shape.d} fill="currentColor" stroke="none" />
        ) : (
          <path key={index} d={shape.d} />
        ),
      )}
    </svg>
  );
}
