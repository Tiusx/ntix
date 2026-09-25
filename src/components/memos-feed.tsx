"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import LightboxImage from "@/components/lightbox-image";
import type { Memo } from "@/lib/memos";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(type: string): boolean {
  return type.startsWith("image/");
}

function isVideo(type: string): boolean {
  return type.startsWith("video/");
}

function isAudio(type: string): boolean {
  return type.startsWith("audio/");
}

function getFileIcon(type: string): string {
  if (type.includes("pdf")) return "fa-file-pdf";
  if (type.includes("word") || type.includes("document")) return "fa-file-word";
  if (type.includes("excel") || type.includes("spreadsheet")) return "fa-file-excel";
  if (type.includes("zip") || type.includes("compressed") || type.includes("archive")) return "fa-file-zipper";
  if (type.includes("markdown") || type.includes("md")) return "fa-file-lines";
  if (type.includes("json")) return "fa-file-code";
  if (type.includes("image")) return "fa-file-image";
  if (type.includes("video")) return "fa-file-video";
  if (type.includes("audio")) return "fa-file-audio";
  return "fa-file";
}

function formatDateFallback(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("month")} ${get("day")}, ${get("year")} ${get("hour")}:${get("minute")}`;
  } catch {
    return formatDateFallback(iso);
  }
}

/**
 * 客户端本地时区时间。
 *
 * 服务端无法得知访问者时区，因此 SSR 用确定性的 fallback 首屏渲染，
 * 挂载后再切换为本地时区格式。用 useSyncExternalStore 而非
 * useEffect + setState：后者会在 effect 体内同步 setState 触发级联渲染，
 * 且需要 suppressHydrationWarning 才能压掉不一致。
 */
function ClientTime({ iso }: { iso: string }) {
  const display = useSyncExternalStore(
    // 该值不会「变化」，空订阅即可
    () => () => {},
    () => formatAbsoluteDate(iso),
    () => formatDateFallback(iso),
  );
  return (
    <time className="text-sub" dateTime={iso} suppressHydrationWarning>
      {display}
    </time>
  );
}

function extractImages(content: string): { images: string[]; clean: string } {
  const images: string[] = [];
  const clean = content
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, _alt, url: string) => {
      images.push(url.trim());
      return "";
    })
    .replace(/^\s*#(?!#)\S[^\n]*\n?/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { images, clean };
}

function ImageGrid({ urls, label }: { urls: string[]; label?: string }) {
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <div className="mt-3 memo-img-wrap aspect-16-9">
        <LightboxImage
          src={urls[0]}
          alt={label ?? ""}
          loading="lazy"
          className="cursor-pointer"
        />
      </div>
    );
  }

  const gridCols = urls.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`mt-3 grid ${gridCols} gap-1.5`}>
      {urls.map((src, i) => (
        <div key={i} className="memo-img-wrap aspect-square">
          <LightboxImage
            src={src}
            alt={label ?? ""}
            loading="lazy"
            className="cursor-pointer"
          />
        </div>
      ))}
    </div>
  );
}

function AudioPlayer({ src, filename }: { src: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setCurrentTime(formatTime(audio.currentTime));
    };
    const onLoadedMetadata = () => {
      setDuration(formatTime(audio.duration));
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="mt-3 memo-audio-player">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent/80"
        >
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-sm ml-0.5`}></i>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{filename}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
            <span className="shrink-0 tabular-nums">{currentTime}</span>
            <div className="relative h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-line"
              onClick={(e) => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                audio.currentTime = ratio * audio.duration;
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 tabular-nums">{duration}</span>
          </div>
        </div>
        <a
          href={src}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white"
          title="下载"
        >
          <i className="fa-solid fa-download text-sm"></i>
        </a>
      </div>
      <audio ref={audioRef} preload="metadata" className="hidden">
        <source src={src} />
      </audio>
    </div>
  );
}

function MediaGrid({ attachments }: { attachments: Memo["attachments"] }) {
  const images = attachments.filter((a) => isImage(a.type));
  const videos = attachments.filter((a) => isVideo(a.type));
  const audios = attachments.filter((a) => isAudio(a.type));
  const files = attachments.filter(
    (a) => !isImage(a.type) && !isVideo(a.type) && !isAudio(a.type),
  );

  if (images.length === 0 && videos.length === 0 && audios.length === 0 && files.length === 0) {
    return null;
  }

  return (
    <>
      <ImageGrid urls={images.map((a) => a.externalLink)} />
      {videos.map((v) => (
        <div key={v.name} className="mt-3 memo-img-wrap aspect-16-9 rounded-lg overflow-hidden">
          <video
            src={v.externalLink}
            controls
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>
      ))}
      {audios.map((a) => (
        <AudioPlayer key={a.name} src={a.externalLink} filename={a.filename} />
      ))}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="memo-file-link flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 hover:border-accent/50 hover:bg-accent/5 transition-all"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <i className={`fa-solid ${getFileIcon(f.type)} text-base`}></i>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{f.filename}</p>
                <p className="text-xs text-muted">{formatSize(Number(f.size) || 0)}</p>
              </div>
              <a
                href={f.externalLink}
                download={f.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white"
                title="下载"
              >
                <i className="fa-solid fa-download text-sm"></i>
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function detectEmbedType(url: string): { platform: string; embedUrl: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // Bilibili
    if (host.includes("bilibili.com")) {
      const bvMatch = u.pathname.match(/\/video\/(BV[\w]+)/);
      if (bvMatch) {
        return {
          platform: "bilibili",
          embedUrl: `//player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0&high_quality=1`,
        };
      }
    }

    // 网易云音乐
    if (host.includes("music.163.com")) {
      const songMatch = u.hash.match(/id=(\d+)/) || u.searchParams.get("id");
      if (songMatch) {
        const id = typeof songMatch === "string" ? songMatch : songMatch[1];
        return {
          platform: "netease",
          embedUrl: `//music.163.com/outchain/player?type=2&id=${id}&auto=0`,
        };
      }
    }

    // 抖音
    if (host.includes("douyin.com")) {
      return { platform: "douyin", embedUrl: url };
    }

    // 豆瓣
    if (host.includes("douban.com")) {
      return { platform: "douban", embedUrl: url };
    }
  } catch {
    // invalid URL
  }
  return null;
}

function EmbedCard({ url, children }: { url: string; children: React.ReactNode }) {
  const embed = detectEmbedType(url);
  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-accent underline decoration-accent/35 hover:decoration-accent"
      >
        {children}
      </a>
    );
  }

  if (embed.platform === "bilibili") {
    return (
      <div className="my-3 -mx-6 overflow-hidden sm:-mx-6 lg:-mx-6">
        <iframe
          src={embed.embedUrl}
          className="w-full aspect-video border-0"
          allowFullScreen={true}
          loading="lazy"
        />
      </div>
    );
  }

  if (embed.platform === "netease") {
    return (
      <div className="my-3 -mx-6 overflow-hidden sm:-mx-6 lg:-mx-6">
        <iframe
          src={embed.embedUrl}
          className="w-full border-0"
          style={{ height: 86 }}
          loading="lazy"
        />
      </div>
    );
  }

  // 抖音、豆瓣 - 预览卡
  let hostName = "";
  try {
    hostName = new URL(url).hostname.replace("www.", "");
  } catch {
    hostName = url;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="memo-embed-card my-3 flex items-center gap-3 rounded-xl border border-line p-3 hover:border-accent/50 hover:bg-accent/5 transition-all"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <i className={`fa-brands fa-${embed.platform === "douyin" ? "tiktok" : "apple"} text-lg`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{children}</p>
        <p className="text-xs text-muted">{hostName}</p>
      </div>
      <div className="shrink-0 text-muted">
        <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
      </div>
    </a>
  );
}

function LocationMarker({ location }: { location: Memo["location"] }) {
  if (!location?.placeholder) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" title={`${location.latitude}, ${location.longitude}`}>
      <i className="fa-solid fa-location-dot text-[10px]"></i>
      <span>{location.placeholder}</span>
    </span>
  );
}

export function MemosFeed({ memos }: { memos: Memo[] }) {
  if (memos.length === 0) {
    return <p className="py-8 text-sub">暂无动态。</p>;
  }

  return (
    <div>
      {memos.map((memo) => {
        const { images: inlineImages, clean } = extractImages(memo.content);

        return (
          <article
            key={memo.slug}
            className="mb-4 rounded-xl border border-line bg-card p-6 shadow-sm shadow-black/5 memo-card"
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {memo.pinned && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  置顶
                </span>
              )}
              <ClientTime iso={memo.date} />
              {memo.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/memos/tag/${encodeURIComponent(tag)}/`}
                  className="text-accent hover:underline hover:decoration-accent/60"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <hr className="border-line/40" />

            {clean && (
              <div className="text-[15px] leading-relaxed [&_p]:my-3 [&_p:last-child]:mb-0" data-memo-content>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    a: ({ href, children }) => {
                      if (href && /^https?:\/\//.test(href)) {
                        return <EmbedCard url={href}>{children}</EmbedCard>;
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline decoration-accent/35 hover:decoration-accent"
                        >
                          {children}
                        </a>
                      );
                    },
                    img: ({ src, alt }) => (
                      <div className="my-2 memo-img-wrap aspect-16-9">
                        <LightboxImage
                          src={typeof src === "string" ? src : ""}
                          alt={alt ?? ""}
                          loading="lazy"
                          className="cursor-pointer"
                        />
                      </div>
                    ),
                    iframe: (props) => {
                      const {
                        allowFullScreen,
                        src: rawSrc,
                        width,
                        height,
                        className,
                        node,
                        ...rest
                      } = props;
                      const srcStr = typeof rawSrc === "string" ? rawSrc : "";
                      const src = srcStr.startsWith("//") ? `https:${srcStr}` : srcStr;
                      const isMusic = src.includes("music.163.com/outchain/player");
                      const isBili = src.includes("player.bilibili.com");
                      const hasFullscreen =
                        allowFullScreen === true ||
                        (allowFullScreen as unknown as string) === "" ||
                        (allowFullScreen as unknown as string) === "true";
                      return (
                        <iframe
                          {...rest}
                          src={isMusic ? src.replace(/([?&])auto=1/, "$1auto=0") : src}
                          allowFullScreen={hasFullscreen}
                          frameBorder="0"
                          className={
                            isBili
                              ? "my-3 w-full aspect-video border-0 rounded-lg bg-black/5"
                              : isMusic
                                ? "my-3 w-full border-0 rounded-lg"
                                : (className as string) ?? ""
                          }
                          width={isMusic ? "100%" : width}
                          height={isMusic ? "86" : height}
                        />
                      );
                    },
                    code({ className, children }) {
                      const isBlock = /language-[\w+-]+/.test(className ?? "");
                      if (!isBlock) {
                        return (
                          <code className="rounded border border-line/80 bg-accent/10 px-1.5 py-0.5 font-mono text-[0.85em]">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block overflow-x-auto rounded-lg border border-line bg-card p-4 font-mono text-[0.85em] leading-relaxed">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {clean}
                </ReactMarkdown>
              </div>
            )}

            {inlineImages.length > 0 && <ImageGrid urls={inlineImages} />}

            {memo.attachments?.length > 0 && (
              <MediaGrid attachments={memo.attachments} />
            )}

            {memo.location && (
              <div className="mt-3 pt-3 border-t border-line/40">
                <LocationMarker location={memo.location} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
