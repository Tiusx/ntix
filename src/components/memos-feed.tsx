import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Link from "next/link";
import LightboxImage from "@/components/lightbox-image";
import { AudioPlayer } from "@/components/audio-player";
import { ClientTime } from "@/components/client-time";
import { Icon } from "@/components/icon";
import type { Memo } from "@/lib/memos";

/**
 * Memos 信息流。
 *
 * 这个文件刻意没有 "use client"：memos 的内容在构建期就固定了，Markdown 必须
 * 在服务端渲染成 HTML。此前整个组件是 client 组件，等于为了 20 条碎碎念把
 * react-markdown + remark-gfm + rehype-raw 整套（约 320KB 未压缩）塞进浏览器。
 * 现在只有音频播放器、本地时间、灯箱这三个真正需要交互的部分是 client 岛。
 */

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

type FileIcon = "file-image" | "file-video" | "file-audio" | "file-text";

/** 附件图标只区分四类：图片 / 视频 / 音频 / 其他文档。 */
function getFileIcon(type: string): FileIcon {
  if (type.startsWith("image")) return "file-image";
  if (type.startsWith("video")) return "file-video";
  if (type.startsWith("audio")) return "file-audio";
  return "file-text";
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
        <LightboxImage src={urls[0]} alt={label ?? ""} loading="lazy" className="cursor-pointer" />
      </div>
    );
  }

  const gridCols = urls.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`mt-3 grid ${gridCols} gap-1.5`}>
      {urls.map((src, i) => (
        <div key={i} className="memo-img-wrap aspect-square">
          <LightboxImage src={src} alt={label ?? ""} loading="lazy" className="cursor-pointer" />
        </div>
      ))}
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
                <Icon name={getFileIcon(f.type)} size={18} />
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
                <Icon name="download" size={15} />
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
          title="Bilibili 视频"
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
          title="网易云音乐"
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
        <Icon name="external" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{children}</p>
        <p className="text-xs text-muted">{hostName}</p>
      </div>
      <div className="shrink-0 text-muted">
        <Icon name="external" size={13} />
      </div>
    </a>
  );
}

function LocationMarker({ location }: { location: Memo["location"] }) {
  if (!location?.placeholder) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted"
      title={`${location.latitude}, ${location.longitude}`}
    >
      <Icon name="location" size={12} />
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
                          title={isMusic ? "网易云音乐" : isBili ? "Bilibili 视频" : "嵌入内容"}
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

            {memo.attachments?.length > 0 && <MediaGrid attachments={memo.attachments} />}

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
