"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MAX_IMAGES, type FeedItem, type FeedPayload } from "@/lib/feeds";
import { FRIENDS, siteHost, type Friend } from "@/lib/friends";

/**
 * 友圈阅读器。
 *
 * 数据先请求 /api/feeds（Pages Function 实时抓 + 30 分钟缓存），失败再退回
 * /feeds.json（构建期快照）——本地 `next dev` 没有 Functions，靠的就是后者。
 *
 * 筛选只有两个入口：「全部」和「博主」。点「博主」展开好友列表，选中后按钮
 * 直接显示该博主名字，一眼能看出当前在看谁。
 *
 * 未读状态存 localStorage：首次访问把「已读时间」设为当下（不然一进来满屏红点），
 * 之后只高亮比它新的条目；用 useSyncExternalStore 读取，避免 effect 里 setState。
 */

const SEEN_KEY = "ntix-circle-seen";
const SEEN_EVENT = "ntix-circle-seen-change";

/** 每批渲染条数：先出 12 条，滚到底再续，避免一进页面就铺 30+ 条。 */
const PAGE_SIZE = 12;

function subscribeSeen(onChange: () => void): () => void {
  window.addEventListener(SEEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSeen(): number {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

const serverSeen = (): number => 0;

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatUpdated(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 朋友圈式的时间：一小时内按分钟，一周内按天，更早显示日期。 */
function relativeTime(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(iso);
}

/** 方形头像；没有头像或加载失败时退回首字方块。悬停展出博主资料卡。 */
function SourceAvatar({ item, profile }: { item: FeedItem; profile?: Friend }) {
  const [failed, setFailed] = useState(false);
  const base = "block h-10 w-10 shrink-0 rounded-[4px] border border-line";

  const face =
    !item.avatar || failed ? (
      <span
        className={`${base} flex items-center justify-center bg-card font-mono text-[12px] text-muted`}
        aria-hidden="true"
      >
        {item.source.slice(0, 1)}
      </span>
    ) : (
      <img
        src={item.avatar}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${base} object-cover`}
      />
    );

  return (
    <span className="group/avatar relative inline-flex shrink-0">
      {face}
      {profile ? (
        // 纯 CSS 悬停：不额外挂事件，鼠标离开自然收起；pointer-events-none 保证
        // 卡片本身不抢走外层链接的点击。只能贴右侧——头像紧贴内容区左边缘，
        // 放左边会被 main 的 overflow-x: hidden 裁掉（实测只剩一条边框）
        <span className="pointer-events-none invisible absolute left-full top-0 z-30 ml-2 hidden w-52 rounded-md border border-line bg-card p-3 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover/avatar:visible group-hover/avatar:opacity-100 sm:block">
          <span className="block font-serif text-[13px] font-semibold tracking-wide text-ink">
            {profile.name}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-muted">
            {siteHost(profile.site)}
          </span>
          <span className="mt-1.5 block text-[11.5px] leading-relaxed text-sub">
            {profile.description}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** 微信式九宫格：1 张单列大图，2/4 张两列，其余三列，最多 6 张。 */
function FeedImages({ images }: { images: string[] }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());

  // 失效的图源直接剔除（外站图床经常挂），全部失效时整块不渲染，
  // 否则会留下几个空灰格子，比没有图更难看
  const list = images.slice(0, MAX_IMAGES).filter((src) => !failed.has(src));
  if (list.length === 0) return null;

  const cols = list.length === 1 ? 1 : list.length === 2 || list.length === 4 ? 2 : 3;
  // 类名必须写全：Tailwind 只扫描源码里的静态字符串，`grid-cols-${cols}` 会被漏掉
  const gridClass =
    cols === 1 ? "max-w-[220px] grid-cols-1" : cols === 2 ? "max-w-[248px] grid-cols-2" : "max-w-[300px] grid-cols-3";

  return (
    <div className={`mt-3 grid gap-1 ${gridClass}`}>
      {list.map((src) => (
        <span
          key={src}
          className="block overflow-hidden rounded-[4px] border border-line bg-card"
        >
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(src);
                return next;
              })
            }
            className={`h-full w-full object-cover ${
              list.length === 1 ? "aspect-[4/3]" : "aspect-square"
            }`}
          />
        </span>
      ))}
    </div>
  );
}

/** 菜单里的小头像，20px；加载失败同样退回首字。 */
function MenuAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [failed, setFailed] = useState(false);
  const base = "h-5 w-5 shrink-0 rounded-[3px] border border-line";

  if (!avatar || failed) {
    return (
      <span
        className={`${base} flex items-center justify-center bg-card text-[9px] text-muted`}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={avatar}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${base} object-cover`}
    />
  );
}

export function FeedReader() {
  const [payload, setPayload] = useState<FeedPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /** 已渲染条数：滚到底部再续，首屏只出 PAGE_SIZE 条 */
  const [visible, setVisible] = useState(PAGE_SIZE);
  const menuRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, serverSeen);

  // 点菜单外面或按 Esc 收起
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // 首次访问：把已读时间设成现在，避免第一次进来每条都是未读
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) {
        window.localStorage.setItem(SEEN_KEY, String(Date.now()));
        window.dispatchEvent(new Event(SEEN_EVENT));
      }
    } catch {
      // 隐私模式下 localStorage 不可用，忽略即可
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (const url of ["/api/feeds", "/feeds.json"]) {
        try {
          const response = await fetch(url, { headers: { accept: "application/json" } });
          if (!response.ok) continue;
          const data = (await response.json()) as FeedPayload;
          if (!Array.isArray(data.items)) continue;
          if (!cancelled) {
            setPayload(data);
            setStatus("ready");
          }
          return;
        } catch {
          // 换下一个数据源
        }
      }
      if (!cancelled) setStatus("error");
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const sources = payload?.sources ?? [];
  // 菜单里每位博主用自己最新一条的头像；没有就退回首字方块
  const avatars = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of payload?.items ?? []) {
      if (item.avatar && !map.has(item.source)) map.set(item.source, item.avatar);
    }
    return map;
  }, [payload]);
  const selected = filter === "all" ? null : filter;
  // 头像悬停卡要展示的博主资料（简介来自 friends.json；feed 里没有这个字段）
  const profiles = useMemo(() => {
    const map = new Map<string, Friend>();
    for (const friend of FRIENDS) map.set(friend.name, friend);
    return map;
  }, []);
  const items = useMemo(() => {
    const all = payload?.items ?? [];
    return filter === "all" ? all : all.filter((item) => item.source === filter);
  }, [payload, filter]);

  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  // 列表末尾的哨兵进入视口（含 400px 预读）就续一批。
  // 依赖 visible：每次续完重建观察器，否则哨兵挪走后不会再触发。
  useEffect(() => {
    if (visible >= items.length) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((value) => value + PAGE_SIZE);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, items.length]);

  // 切筛选时从头开始，别把上一个筛选的展开深度带过来；
  // 已经在页面底部时也回到顶部，否则会停在别人的列表尾巴上
  const changeFilter = (next: string) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unread = useMemo(() => {
    const all = payload?.items ?? [];
    return all.filter((item) => {
      const time = Date.parse(item.date);
      return Number.isFinite(time) && time > seen;
    }).length;
  }, [payload, seen]);

  const markAllRead = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // 存不上不影响本次会话
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  };

  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  if (status === "loading") {
    return (
      <div>
        <p className="mb-4 font-mono text-[10.5px] text-muted">正在读取…</p>
        <ul className="space-y-6" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex gap-3">
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-line/60" />
              <div className="flex-1 space-y-2">
                <span className="block h-2 w-24 rounded bg-line/60" />
                <span className="block h-4 w-3/4 rounded bg-line/60" />
                <span className="block h-3 w-full rounded bg-line/60" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === "error" || !payload) {
    return (
      <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
        <p className="text-sm text-sub">暂时取不到友圈数据。</p>
        <p className="mt-1 text-xs text-muted">可能是网络问题，或边缘函数还没部署。</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 cursor-pointer rounded-full border border-line px-4 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
        >
          重试
        </button>
      </div>
    );
  }

  const failed = sources.filter((source) => source.error);

  return (
    <div>
      <p className="mb-2.5 font-mono text-[11.5px] text-muted">
        {items.length} 篇 · {sources.length} 个博主 · 更新于 {formatUpdated(payload.updatedAt)}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3 font-mono text-[11.5px] tracking-[0.04em]">
        <button
          type="button"
          onClick={() => changeFilter("all")}
          aria-pressed={filter === "all"}
          className={`cursor-pointer border-b pb-0.5 transition-colors ${
            filter === "all"
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          全部 {payload.items.length}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex cursor-pointer items-center gap-1 border-b pb-0.5 transition-colors ${
              selected
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {selected ?? "博主"}
            <span
              aria-hidden="true"
              className={`text-[8px] leading-none transition-transform duration-150 ${
                menuOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label="选择博主"
              className="absolute left-0 top-full z-20 mt-2 w-44 rounded-md border border-line bg-card p-1 shadow-lg shadow-black/10"
            >
              <p className="px-2 pb-1 pt-1.5 text-[10px] tracking-[0.12em] text-muted">
                选择博主
              </p>
              {sources.map((source) => {
                const checked = filter === source.name;
                return (
                  <button
                    key={source.name}
                    type="button"
                    role="menuitemradio"
                    aria-checked={checked}
                    onClick={() => changeFilter(source.name)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-line/30 ${
                      checked ? "text-ink" : "text-sub"
                    }`}
                  >
                    <MenuAvatar name={source.name} avatar={avatars.get(source.name)} />
                    <span className="truncate">{source.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-muted">
                      {source.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={markAllRead}
          className="ml-auto cursor-pointer text-muted transition-colors hover:text-ink"
        >
          全部已读{unread > 0 ? ` (${unread})` : ""}
        </button>
      </div>

      {failed.length > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-muted">
          {failed.length} 个源暂时抓不到：{failed.map((source) => source.name).join("、")}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">最近没有更新。</p>
      ) : (
        <>
          <ul className="mt-2">
            {shown.map((item) => {
              const time = Date.parse(item.date);
              const isUnread = Number.isFinite(time) && time > seen;
              return (
                <li key={item.link} className="border-b border-line py-5 first:pt-2">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex gap-3.5"
                  >
                    <SourceAvatar item={item} profile={profiles.get(item.source)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold tracking-wide text-sub">
                          {item.source}
                        </span>
                        {isUnread ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                            aria-label="未读"
                          />
                        ) : null}
                      </div>
                      <h2 className="mt-1.5 text-[17px] font-semibold leading-[1.5] text-ink decoration-accent underline-offset-4 group-hover:underline">
                        {item.title}
                      </h2>
                      {item.excerpt ? (
                        <p className="mt-1.5 line-clamp-3 text-[15px] leading-[1.75] text-sub">
                          {item.excerpt}
                        </p>
                      ) : null}
                      {item.images && item.images.length > 0 ? (
                        <FeedImages images={item.images} />
                      ) : null}
                      <div className="mt-3 flex items-center gap-2 font-mono text-[11.5px] text-muted">
                        <time className="tabular-nums" dateTime={item.date}>
                          {relativeTime(item.date)}
                        </time>
                        <span className="text-line" aria-hidden="true">·</span>
                        <span className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          查看原文 →
                        </span>
                      </div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>

          {remaining > 0 ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              {/* 哨兵：滚到这里就自动续一批；按钮给不支持观察器的情况兜底 */}
              <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setVisible((value) => value + PAGE_SIZE)}
                className="cursor-pointer rounded-full border border-line px-5 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                加载更多（还有 {remaining} 篇）
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
