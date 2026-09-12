import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const MMM = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][d.getMonth()];
  return `${MMM} ${`0${d.getDate()}`.slice(-2)}, ${d.getFullYear()} ${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}`;
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

function KotobaImageGrid({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="mt-3">
        <LightboxImage
          src={images[0]}
          alt=""
          loading="lazy"
          className="max-h-96 w-full cursor-pointer rounded-lg object-cover"
        />
      </div>
    );
  }

  const gridCols = images.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`mt-3 grid ${gridCols} gap-1`}>
      {images.map((src, i) => (
        <LightboxImage
          key={i}
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full cursor-pointer rounded-lg object-cover"
          wrapperClassName="block aspect-square overflow-hidden"
        />
      ))}
    </div>
  );
}

function MediaGrid({ attachments }: { attachments: Memo["attachments"] }) {
  const images = attachments.filter((a) => isImage(a.type));
  const videos = attachments.filter((a) => isVideo(a.type));
  const files = attachments.filter((a) => !isImage(a.type) && !isVideo(a.type));

  if (videos.length === 0 && files.length === 0 && images.length === 0) {
    return null;
  }

  return (
    <>
      {images.length === 1 && (
        <div className="mt-3">
          <LightboxImage
            src={images[0].externalLink}
            alt={images[0].filename}
            loading="lazy"
            className="max-h-96 w-full cursor-pointer rounded-lg object-cover"
          />
        </div>
      )}
      {images.length >= 2 && (
        <div
          className={`mt-3 grid ${
            images.length === 2 ? "grid-cols-2" : "grid-cols-3"
          } gap-1`}
        >
          {images.map((img) => (
            <LightboxImage
              key={img.name}
              src={img.externalLink}
              alt={img.filename}
              loading="lazy"
              className="h-full w-full cursor-pointer rounded-lg object-cover"
              wrapperClassName="block aspect-square overflow-hidden"
            />
          ))}
        </div>
      )}
      {videos.map((v) => (
        <video
          key={v.name}
          src={v.externalLink}
          controls
          preload="metadata"
          className="mt-3 w-full rounded-lg"
        />
      ))}
      <div className="mt-3 space-y-1.5">
        {files.map((f) => (
          <a
            key={f.name}
            href={f.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm text-sub hover:underline"
          >
            <span className="truncate">{f.filename}</span>
            <span className="shrink-0 text-xs text-muted">
              {formatSize(Number(f.size) || 0)}
            </span>
          </a>
        ))}
      </div>
    </>
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
            className="mb-4 rounded-xl border border-line bg-card p-6 shadow-sm shadow-black/5"
          >
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              {memo.pinned && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  置顶
                </span>
              )}
              <time className="text-sub" dateTime={memo.date}>
                {formatAbsoluteDate(memo.date)}
              </time>
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
              <div className="text-[15px] leading-relaxed [&_p]:my-3 [&_p:last-child]:mb-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 decoration-ink/35 hover:decoration-ink"
                      >
                        {children}
                      </a>
                    ),
                    img: ({ src, alt }) => (
                      <LightboxImage
                        src={typeof src === "string" ? src : ""}
                        alt={alt ?? ""}
                        loading="lazy"
                        className="my-2 cursor-pointer rounded-lg"
                      />
                    ),
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
                        <code
                          className="block overflow-x-auto rounded-lg border border-line bg-card p-4 font-mono text-[0.85em] leading-relaxed"
                        >
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

            {inlineImages.length > 0 && <KotobaImageGrid images={inlineImages} />}

            {memo.attachments?.length > 0 && (
              <MediaGrid attachments={memo.attachments} />
            )}
          </article>
        );
      })}
    </div>
  );
}