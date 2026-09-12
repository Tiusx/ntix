import type { Metadata } from "next";
import Image from "next/image";
import { FRIENDS } from "@/data/friends";
import { WalineComments } from "@/components/waline-comments";

export const metadata: Metadata = {
  title: "友链",
  description: "值得一去的好友与工具站点。",
};

function initial(name: string): string {
  return (name || "?").trim().charAt(0);
}

function avatarSrc(friend: { name: string; avatar?: string }): string {
  return friend.avatar ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend.name)}`;
}

export default function FriendsPage() {
  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        友链
      </h1>
      <p className="mb-10 text-base text-muted">收录 {FRIENDS.length} 位好友。</p>

      {FRIENDS.length === 0 ? (
        <p className="text-muted">暂无友链。</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FRIENDS.map((friend) => (
            <a
              key={friend.url}
              href={friend.url}
              target="_blank"
              rel="noopener"
              className="group flex items-start gap-3.5 rounded-lg border border-line p-4 transition-colors hover:border-accent hover:bg-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card font-serif text-base text-muted ring-1 ring-line transition-colors group-hover:text-accent overflow-hidden">
                {friend.avatar ? (
                  <Image
                    src={friend.avatar}
                    alt=""
                    width={44}
                    height={44}
                    className="object-cover"
                  />
                ) : (
                  initial(friend.name)
                )}
              </span>
              <div className="min-w-0">
                <div className="font-serif font-bold text-[15px] text-ink underline-offset-4 transition-colors group-hover:underline group-hover:decoration-accent">
                  {friend.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {friend.url.replace(/^https?:\/\//, "")}
                </div>
                {friend.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {friend.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="mb-3 font-serif text-lg font-bold tracking-tight text-ink">
          申请友链
        </h2>
<p className="max-w-[520px] text-sm leading-relaxed text-muted">
          欢迎交换友链，请提供<strong className="text-ink">站点名称</strong>
          + <strong className="text-ink">链接</strong>
          + <strong className="text-ink">一句简介</strong>
          + <strong className="text-ink">头像 URL (可选)</strong>，
          我会尽快审核并收录。
        </p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink">提交示例 (JSON)：</p>
          <pre className="rounded bg-muted/10 p-3 text-xs text-muted overflow-x-auto">
{`{
  name: "Tiusx", #小石头博客
  url: "https://tius.cn/",
  description: "凡是过往，皆为序章， 照进黑暗中的那束光为救赎",
  avatar: "https://r2.tius.cn/avatar/favicon.ico"
}`}
          </pre>
        </div>
      </section>

      <WalineComments path="/friends/" />
    </main>
  );
}