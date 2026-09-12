import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllMemos, type Memo } from "@/lib/memos";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

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

function MediaGrid({ attachments }: { attachments: Memo["attachments"] }) {
  const images = attachments.filter((a) => isImage(a.type));
  const videos = attachments.filter((a) => isVideo(a.type));
  const files = attachments.filter((a) => !isImage(a.type) && !isVideo(a.type));

  return (
    <>
      {images.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}
        >
          {images.map((img) => (
            <a
              key={img.name}
              href={img.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group/photo block overflow-hidden rounded-md ring-1 ring-line transition-all duration-200 hover:ring-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.externalLink}
                alt={img.filename}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-200 group-hover/photo:scale-105"
              />
            </a>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-3 space-y-2">
          {videos.map((v) => (
            <video
              key={v.name}
              src={v.externalLink}
              controls
              preload="metadata"
              className="w-full rounded-md ring-1 ring-line"
            />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f) => (
            <a
              key={f.name}
              href={f.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <span className="truncate">
                <i className="fa-solid fa-paperclip mr-2 text-xs" aria-hidden="true" />
                {f.filename}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {formatSize(Number(f.size) || 0)}
              </span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export function MemosFeed() {
  const memos = getAllMemos();

  if (memos.length === 0) {
    return <p className="text-sm text-muted">暂无说说。</p>;
  }

  const grouped = new Map<string, Memo[]>();
  for (const memo of memos) {
    const key = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
    }).format(new Date(memo.date));
    const list = grouped.get(key) ?? [];
    list.push(memo);
    grouped.set(key, list);
  }

  return (
    <div>
      <div className="relative ml-1.5 border-l border-line pl-8">
        {[...grouped.entries()].map(([month, items]) => (
          <section key={month} className="relative mb-12">
            <span className="absolute -left-[37px] top-1.5 h-3 w-3 rounded-full bg-ink" />
            <h2 className="mb-4 font-serif text-xl font-bold tracking-tight text-ink">
              {month}
              <span className="ml-3 font-sans text-sm font-normal text-muted">
                {items.length} 条
              </span>
            </h2>
            <div className="space-y-4">
              {items.map((memo, idx) => (
                <article
                  key={memo.slug}
                  className={`relative rounded-lg border transition-colors hover:border-accent ${
                    memo.pinned ? "border-accent/50 bg-card" : "border-line"
                  }`}
                >
                  <span className="absolute -left-[31px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-line" />
                  <div className="p-4">
                    {memo.content && (
                      <div className="memo-md font-serif text-[15px] leading-relaxed text-ink">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent"
                              >
                                {children}
                              </a>
                            ),
                            img: ({ src, alt }) => (
                              <a
                                href={typeof src === "string" ? src : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/photo my-2 block overflow-hidden rounded-md ring-1 ring-line transition-all duration-200 hover:ring-accent"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={typeof src === "string" ? src : ""}
                                  alt={alt ?? ""}
                                  loading="lazy"
                                  className="max-h-[480px] w-full object-cover transition-transform duration-200 group-hover/photo:scale-[1.01]"
                                />
                              </a>
                            ),
                          }}
                        >
                          {memo.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {memo.attachments?.length > 0 && (
                      <MediaGrid attachments={memo.attachments} />
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {memo.pinned && (
                        <span className="text-accent">
                          <i className="fa-solid fa-thumbtack mr-1" aria-hidden="true" />
                          置顶
                        </span>
                      )}
                      <span>
                        {formatDate(memo.date)}
                        {idx === 0 && (
                          <span className="ml-1.5 text-muted">
                            ·{" "}
                            {new Intl.DateTimeFormat("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(memo.date))}
                          </span>
                        )}
                      </span>
                      {memo.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-card px-2 py-0.5 text-muted ring-1 ring-line"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}