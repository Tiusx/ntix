import Link from "next/link";
import { SITE_CONFIG } from "@/site.config";

const LINKS: [string, string][] = [
  ["文章", "/blog/"],
  ["栏目", "/columns/"],
  ["归档", "/archive/"],
];

export function Header() {
  return (
    <header className="content flex items-center justify-between py-6">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-ink"
      >
        {SITE_CONFIG.title}
      </Link>
      <nav className="flex items-center gap-5 text-sm">
        {LINKS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="text-muted transition-colors hover:text-ink"
          >
            {label}
          </Link>
        ))}
        <a
          href="/rss.xml"
          target="_blank"
          rel="noreferrer"
          className="text-muted transition-colors hover:text-ink"
        >
          RSS
        </a>
      </nav>
    </header>
  );
}