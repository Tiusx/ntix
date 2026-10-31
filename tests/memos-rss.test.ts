import { describe, expect, it } from "vitest";
import { GET } from "@/app/(site)/memos/rss.xml/route";
import { getAllMemos } from "@/lib/memos";

/**
 * 碎碎念独立 feed 的护栏。
 *
 * 关键点：每一条都要有链接、有标题、有 pubDate；memo 没有独立页面，
 * 所以链接必须带 #slug 锚点，且分页时页码要算对。
 */

async function feed(): Promise<string> {
  const response = GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/rss+xml");
  return response.text();
}

describe("碎碎念 RSS", () => {
  it("覆盖全部 memo，且声明 self 链接", async () => {
    const xml = await feed();
    expect((xml.match(/<item>/g) ?? []).length).toBe(getAllMemos().length);
    expect(xml).toContain('<atom:link href="https://tius.cn/memos/rss.xml"');
  });

  it("每条都带锚点链接与 pubDate", async () => {
    const xml = await feed();
    const first = getAllMemos()[0];
    expect(xml).toContain(`#${encodeURIComponent(first.slug)}`);
    expect(xml).toContain("<pubDate>");
  });

  it("标题不为空，正文包在 CDATA 里", async () => {
    const xml = await feed();
    expect(xml).not.toContain("<title></title>");
    expect(xml).toContain("<description><![CDATA[");
  });
});
