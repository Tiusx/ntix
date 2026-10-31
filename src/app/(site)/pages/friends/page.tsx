import type { Metadata } from "next";
import Link from "next/link";
import { FRIENDS, siteHost } from "@/lib/friends";
import { buildKeywords, withRssCanonical } from "@/lib/seo";
import { FriendAvatar } from "@/components/friend-avatar";
import { Comments } from "@/components/comments";

/**
 * 友链。
 *
 * 数据唯一来源是 src/data/friends.json —— 这页只负责排版，不再手写名单。
 * 同一条数据里 feed 非空的站点会被友圈自动订阅，所以「加友链」和「加订阅源」
 * 是同一个动作，不会出现两边对不上的情况。
 *
 * 路由刻意留在 /pages/friends/：public/_redirects 里 /friends 与 /friends/*
 * 都 301 到这里，改路径会让旧链接断掉。
 */
export const metadata: Metadata = {
  title: "友链",
  description:
    "Tiusx 的友链：值得一去的地方，和值得认识的人。带 RSS 的站点会自动汇总到友圈。",
  keywords: buildKeywords(["友链", "朋友", "links", "友圈"]),
  alternates: withRssCanonical("/pages/friends/"),
};

/** 申请格式：字段与 friends.json 完全一致，复制过去就能用。 */
const SNIPPET = `{
  "name": "Tius",
  "site": "https://tius.cn/",
  "description": "凡是过往，皆为序章",
  "avatar": "https://r2.tius.cn/avatar/favicon.ico",
  "feed": "https://tius.cn/rss.xml"
}`;

export default function FriendsPage() {
  const subscribed = FRIENDS.filter((friend) => (friend.feed ?? "").trim()).length;

  return (
    <main className="content pt-12 pb-12">
      <header className="mb-10">
        <h1 className="font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
          友链
        </h1>
        <p className="mt-3 text-base text-muted">
          值得一去的地方，和值得认识的人。共 {FRIENDS.length} 位，
          其中 {subscribed} 位已接入友圈。
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {FRIENDS.map((friend) => (
          <li key={friend.site}>
            <a
              href={friend.site}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full items-start gap-3 py-3"
            >
              <FriendAvatar name={friend.name} avatar={friend.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-serif text-[1rem] font-semibold tracking-wide text-ink transition-colors group-hover:text-accent">
                    {friend.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted">
                    {siteHost(friend.site)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto shrink-0 text-[11px] text-muted opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100"
                  >
                    ↗
                  </span>
                </div>
                {/* 固定两行高度：否则一列两行、一列一行时，下面那项会错位 */}
                <p className="mt-1 line-clamp-2 min-h-[2.6rem] text-[0.85rem] leading-relaxed text-muted">
                  {friend.description}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-serif text-xl font-extrabold tracking-tight text-ink">
          申请友链
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sub">
          欢迎交换友链。请提供站点名称、链接与一句简介，头像和 RSS 可选。
          带 RSS 的站点会自动进入{" "}
          <Link
            href="/circle/"
            className="text-ink decoration-accent underline-offset-4 hover:underline"
          >
            友圈
          </Link>
          ，按时间汇总更新；只填链接的则只出现在这一页。
        </p>
        <pre className="mt-5 overflow-x-auto rounded-md border border-line bg-card p-4 font-mono text-[11.5px] leading-[1.85] text-sub">
          <code>{SNIPPET}</code>
        </pre>
      </section>

      <Comments />
    </main>
  );
}
