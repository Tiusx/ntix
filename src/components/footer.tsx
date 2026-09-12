import { SITE_CONFIG } from "@/site.config";

export function Footer() {
  return (
    <footer className="content pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-6 text-sm text-muted">
        <p>
          © {new Date().getFullYear()} {SITE_CONFIG.title}
        </p>
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-ink"
        >
          CC BY-NC-SA 4.0
        </a>
      </div>
    </footer>
  );
}