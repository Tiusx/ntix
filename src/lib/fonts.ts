/**
 * 外部 Web 字体的加载策略。
 *
 * Noto Serif SC + Press Start 2P 只有 Google Fonts 提供且自带正确的
 * unicode-range 分片，自托管等于把上百个 woff2 搬进仓库，不划算。
 *
 * 但 `<link rel="stylesheet">` 是 render-blocking 的：大陆访问
 * fonts.googleapis.com 经常超时，首屏会一直白着等它。所以改成用
 * 「media=print 先不参与渲染，加载完成再切回 all」的经典做法，
 * 让字体永远是渐进增强——加载不到就退回系统宋体，不阻塞任何绘制。
 */
export const WEBFONT_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Press+Start+2P&display=swap";

export const WEBFONT_LOAD_SCRIPT = `(function(){try{var l=document.createElement("link");l.rel="stylesheet";l.media="print";l.href=${JSON.stringify(
  WEBFONT_HREF,
)};l.onload=function(){l.media="all"};document.head.appendChild(l);}catch(e){}})();`;
