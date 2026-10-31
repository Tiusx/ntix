import { describe, expect, it } from "vitest";
import {
  mergeItems,
  parseFeed,
  toPlainText,
  type FeedItem,
  type FeedSource,
} from "@/lib/feeds";

/**
 * 友圈解析的回归护栏。
 *
 * 三个真实源的格式各不相同：封尘是 RSS 2.0、熊孝兵是 Atom、贼歪的标题用
 * CDATA 包裹。这些用例就是从它们身上抽出来的最小样本，任何一条挂掉都意味着
 * 线上会少一类源。
 */

const source: FeedSource = {
  name: "测试站",
  site: "https://example.com/",
  feed: "https://example.com/feed",
};

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>测试站</title>
    <item>
      <title><![CDATA[Hello <b>World</b> &amp; bye]]></title>
      <link>https://example.com/hello/</link>
      <pubDate>Fri, 30 Oct 2026 09:22:00 +0800</pubDate>
      <description><![CDATA[<p>Hello <b>world</b> 正文</p>]]></description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>测试站</title>
  <entry>
    <title>Atom Post</title>
    <link rel="alternate" href="/atom-post"/>
    <published>2026-10-29T16:44:22Z</published>
    <summary type="html">&lt;p&gt;摘要 &amp;amp; 更多&lt;/p&gt;</summary>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("解析 RSS 2.0：CDATA 标题、时间、摘要", () => {
    const [item] = parseFeed(RSS, source);
    expect(item.title).toBe("Hello World & bye");
    expect(item.link).toBe("https://example.com/hello/");
    expect(item.date).toBe("2026-10-30T01:22:00.000Z");
    expect(item.excerpt).toBe("Hello world 正文");
    expect(item.source).toBe("测试站");
  });

  it("解析 Atom：link 属性、published、summary", () => {
    const [item] = parseFeed(ATOM, source);
    expect(item.title).toBe("Atom Post");
    expect(item.link).toBe("https://example.com/atom-post");
    expect(item.date).toBe("2026-10-29T16:44:22.000Z");
    expect(item.excerpt).toBe("摘要 & 更多");
  });

  it("相对链接按站点补全", () => {
    const xml = `<rss><channel><item><title>相对链接</title><link>/posts/1</link></item></channel></rss>`;
    const [item] = parseFeed(xml, source);
    expect(item.link).toBe("https://example.com/posts/1");
  });

  it("标题为空时退回域名，不产出空白项", () => {
    const xml = `<rss><channel><item><title></title><link>https://sub.example.com/post</link></item></channel></rss>`;
    const [item] = parseFeed(xml, source);
    expect(item.title).toBe("sub.example.com");
  });

  it("缺少链接的条目被丢弃", () => {
    const xml = `<rss><channel><item><title>没有链接</title></item></channel></rss>`;
    expect(parseFeed(xml, source)).toHaveLength(0);
  });

  it("每个源按上限截断", () => {
    const items = Array.from(
      { length: 20 },
      (_, index) => `<item><title>${index}</title><link>https://example.com/${index}</link></item>`,
    ).join("");
    const xml = `<rss><channel>${items}</channel></rss>`;
    expect(parseFeed(xml, source, 5)).toHaveLength(5);
  });

  it("提取 Atom 的站点头像", () => {
    const xml = `<feed><icon>https://img.example.com/avatar.png</icon><entry><title>标题</title><link href="https://example.com/a"/></entry></feed>`;
    expect(parseFeed(xml, source)[0].avatar).toBe("https://img.example.com/avatar.png");
  });

  it("提取 RSS 的 image.url，配置头像优先", () => {
    const xml = `<rss><channel><image><url>https://img.example.com/rss.png</url></image><item><title>标题</title><link>https://example.com/a</link></item></channel></rss>`;
    expect(parseFeed(xml, source)[0].avatar).toBe("https://img.example.com/rss.png");
    expect(parseFeed(xml, { ...source, avatar: "https://img.example.com/config.png" })[0].avatar).toBe(
      "https://img.example.com/config.png",
    );
  });
});

describe("parseFeed 配图", () => {
  const wrap = (body: string) =>
    `<rss version="2.0"><channel><title>t</title><item><title>文章</title><link>https://example.com/post/</link>${body}</item></channel></rss>`;

  it("从 content:encoded 的 img 里取图", () => {
    const xml = wrap(
      `<content:encoded><![CDATA[<p>正文</p><img src="https://cdn.example.com/a.jpg" /><img src="https://cdn.example.com/b.png" />]]></content:encoded>`,
    );
    expect(parseFeed(xml, source)[0].images).toEqual([
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.png",
    ]);
  });

  it("相对地址按文章链接补全", () => {
    const xml = wrap(`<description><![CDATA[<img src="/uploads/c.jpg">]]></description>`);
    expect(parseFeed(xml, source)[0].images).toEqual(["https://example.com/uploads/c.jpg"]);
  });

  it("enclosure 只在 type 为图片时收录", () => {
    const image = wrap(`<enclosure url="https://cdn.example.com/d.jpg" type="image/jpeg" />`);
    const audio = wrap(`<enclosure url="https://cdn.example.com/e.mp3" type="audio/mpeg" />`);
    expect(parseFeed(image, source)[0].images).toEqual(["https://cdn.example.com/d.jpg"]);
    expect(parseFeed(audio, source)[0].images).toBeUndefined();
  });

  it("最多 6 张，超出的丢弃", () => {
    const imgs = Array.from(
      { length: 10 },
      (_, index) => `<img src="https://cdn.example.com/${index}.jpg">`,
    ).join("");
    const xml = wrap(`<content:encoded><![CDATA[${imgs}]]></content:encoded>`);
    expect(parseFeed(xml, source)[0].images).toHaveLength(6);
  });

  it("跳过头像、图标、表情这类非正文图", () => {
    const xml = wrap(
      `<description><![CDATA[
        <img src="https://cdn.example.com/avatar/me.png">
        <img src="https://cdn.example.com/emoji/smile.gif">
        <img src="https://cdn.example.com/photo/real.jpg">
      ]]></description>`,
    );
    expect(parseFeed(xml, source)[0].images).toEqual(["https://cdn.example.com/photo/real.jpg"]);
  });

  it("没有图时不写 images 字段", () => {
    const xml = wrap(`<description>纯文字</description>`);
    expect(parseFeed(xml, source)[0].images).toBeUndefined();
  });
});

describe("toPlainText", () => {
  it("剥标签、解实体、压空白", () => {
    expect(toPlainText("<p>a &amp; b</p>\n\n<span>c</span>")).toBe("a & b c");
  });

  it("先剥标签再解实体，不会把 &lt;script&gt; 还原成标签", () => {
    expect(toPlainText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("<script>alert(1)</script>");
  });
});

describe("mergeItems", () => {
  const make = (link: string, date: string): FeedItem => ({
    title: link,
    link,
    date,
    excerpt: "",
    source: "测试站",
    sourceUrl: "https://example.com/",
  });

  it("按链接去重（忽略 hash）", () => {
    const merged = mergeItems([make("https://a.com/1", "2026-10-01T00:00:00Z"), make("https://a.com/1#x", "2026-10-02T00:00:00Z")]);
    expect(merged).toHaveLength(1);
  });

  it("按时间倒序，空时间沉底", () => {
    const merged = mergeItems([
      make("https://a.com/old", "2026-09-01T00:00:00Z"),
      make("https://a.com/none", ""),
      make("https://a.com/new", "2026-10-01T00:00:00Z"),
    ]);
    expect(merged.map((item) => item.link)).toEqual([
      "https://a.com/new",
      "https://a.com/old",
      "https://a.com/none",
    ]);
  });

  it("超过上限时只保留最新的", () => {
    const items = Array.from({ length: 10 }, (_, index) =>
      make(`https://a.com/${index}`, `2026-10-0${index % 9 + 1}T00:00:00Z`),
    );
    expect(mergeItems(items, 3)).toHaveLength(3);
  });
});
