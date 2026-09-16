import { BusuanziCounter } from "./busuanzi";

export function Footer() {
  return (
    <footer className="content py-8 border-t border-line text-center text-sm text-muted">
      <BusuanziCounter />
      <p className="mb-1">
        © 2018 - {new Date().getFullYear()} Tiusx ·
        <span id="busuanzi_container_site_pv" style={{ display: "inline" }}>
          本站总访问量 <span id="busuanzi_value_site_pv"></span> 次
        </span>
        ·
        <span id="busuanzi_container_site_uv" style={{ display: "inline" }}>
          访客数 <span id="busuanzi_value_site_uv"></span> 人
        </span>
      </p>
      <p>
        Powered by <a href="https://nextjs.org" target="_blank" rel="noopener" className="hover:underline">Next.js</a> ·
        Deployed on <a href="https://pages.cloudflare.com" target="_blank" rel="noopener" className="hover:underline">Cloudflare Pages</a>
      </p>
    </footer>
  );
}