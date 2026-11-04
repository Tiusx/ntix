import { describe, expect, it } from "vitest";
import { contentFingerprint } from "@scripts/lib/fingerprint";

/**
 * 内容指纹是「uid 重建」与「内容真删」的唯一区分依据，算错就会误删或误拦。
 * 这里锁住三件事：跨行尾一致、跨空白一致、真不同则不同。
 */
describe("contentFingerprint", () => {
  const date = "2026-10-30T00:01:13Z";
  const content = "#随笔\nMinecraft";

  it("同样内容算出同样指纹", () => {
    expect(contentFingerprint(date, content)).toBe(contentFingerprint(date, content));
  });

  it("CRLF 与 LF 视为同一内容", () => {
    expect(contentFingerprint(date, "#随笔\r\nMinecraft")).toBe(
      contentFingerprint(date, content),
    );
  });

  it("首尾空白不影响结果", () => {
    expect(contentFingerprint(date, "\n\n  #随笔\nMinecraft  \n")).toBe(
      contentFingerprint(date, content),
    );
  });

  it("正文不同则指纹不同", () => {
    expect(contentFingerprint(date, "#随笔\nMinecraft 2")).not.toBe(
      contentFingerprint(date, content),
    );
  });

  it("日期不同则指纹不同", () => {
    expect(contentFingerprint("2026-10-31T00:00:00Z", content)).not.toBe(
      contentFingerprint(date, content),
    );
  });

  it("空正文也能稳定成指纹", () => {
    expect(contentFingerprint(date, "")).toBe(contentFingerprint(date, "  \n "));
  });
});
