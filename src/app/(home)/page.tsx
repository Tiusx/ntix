import Link from "next/link";
import { SITE_CONFIG } from "@/site.config";

const SECTIONS: [string, string][] = [
  ["/about/", "@Me"],

  ["/blog/", "博客"],
  // ["/archive/", "项目"],
  // ["/photos/", "摄影"],
  ["/friends/", "朋友"],
  ["/memos/", "碎碎念"],
];

const SOCIALS: [string, string, string][] = [
  ["https://github.com/Tiusx", "fa-brands fa-github", "GitHub"],
  ["https://twitter.com", "fa-brands fa-x-twitter", "Twitter"],
  ["mailto:hi@tius.cn", "fa-solid fa-envelope", "Email"],
  ["/rss.xml", "fa-solid fa-rss", "RSS"],
];

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-page px-6 py-16">
      <div className="flex w-full max-w-[680px] flex-col items-center text-center">

        {/* Avatar */}
        <div className="group/avatar relative size-24">
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-full border border-dashed border-accent/40 [animation:spin_16s_linear_infinite]"
          />
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-card text-ink shadow-lg shadow-accent/10 ring-1 ring-line transition-transform duration-300 ease-out group-hover/avatar:scale-105">
            {SITE_CONFIG.avatar ? (
              <img
                src={SITE_CONFIG.avatar}
                alt="头像"
                width={96}
                height={96}
                className="size-full"
              />
            ) : (
              <i className="fa-solid fa-feather text-3xl" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-7 font-serif text-[2.3rem] font-medium leading-tight tracking-[0.12em] text-ink">
          {SITE_CONFIG.title}
        </h1>

        {/* Tagline */}
        <p className="mt-2.5 text-[0.9rem] tracking-[0.3em] text-sub">
          {SITE_CONFIG.tagline}
        </p>

        <span className="my-6 block h-px w-14 bg-line" />

        {/* Quote */}
        <p className="max-w-[520px] font-serif text-[1.25rem] font-normal italic leading-[1.7] text-muted">
          <i className="fa-solid fa-quote-left mr-2 text-[0.85rem] text-muted" aria-hidden="true" />
          {SITE_CONFIG.description}
        </p>

        {/* Socials */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.8rem] text-sub">
          {SOCIALS.map(([href, icon, label]) => (
            <a
              key={label}
              href={href}
              className="group/soc flex items-center gap-1.5 transition-all duration-200 ease-out hover:-translate-y-0.5"
            >
              <i
                className={`${icon} text-[0.85rem] text-muted transition-colors duration-200 group-hover/soc:text-ink`}
                aria-hidden="true"
              />
              <span className="transition-colors duration-200 group-hover/soc:text-ink">
                {label}
              </span>
            </a>
          ))}
        </div>

        <span className="mt-5 block h-px w-14 bg-line" />

        {/* Sections */}
        <nav className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3.5 gap-y-2 font-serif text-[1rem] text-sub">
          {SECTIONS.map(([href, label], i) => (
            <span key={href} className="flex items-baseline gap-x-3.5">
              {i > 0 && <span className="text-muted">·</span>}
              <Link
                href={href}
                className="group/lnk relative transition-all duration-200 ease-out"
              >
                {label}
                <span className="absolute -bottom-0.5 left-1/2 block h-px w-0 -translate-x-1/2 bg-accent transition-all duration-200 group-hover/lnk:w-full" />
              </Link>
            </span>
          ))}
        </nav>

        <p className="mt-7 text-[0.75rem] text-muted">
          © {new Date().getFullYear()} {SITE_CONFIG.title}
        </p>
      </div>
    </main>
  );
}