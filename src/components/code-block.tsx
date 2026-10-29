"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 代码块。
 *
 * 结构：外壳（边框 + 圆角）→ 头栏（语言 / 复制）→ 代码区。
 * 高亮由构建期 shiki 完成，客户端只负责外壳与复制交互。
 *
 * 行号用 CSS counter 画在 shiki 的 <span class="line"> 上，不在 JS 里按行
 * split——那样会破坏高亮结构。少于 4 行的片段不显示行号，避免数字比代码显眼。
 */

const COPY_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CHECK_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise<void>((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch (error) {
      reject(error);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

export default function CodeBlock({
  children,
  lang: initialLang,
  lineCount = 0,
}: {
  children?: React.ReactNode;
  /** 由 MDX 层从 <code class="language-x"> 透传 */
  lang?: string;
  /** 由 MDX 层统计的行数，决定是否显示行号 */
  lineCount?: number;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState(initialLang ?? "");

  useEffect(() => {
    if (lang) return;
    const pre = preRef.current;
    const code = pre?.querySelector("code");
    const attr =
      code?.getAttribute("data-language") ?? pre?.getAttribute("data-language") ?? "";
    const fromClass = /language-([\w+-]+)/.exec(code?.className ?? "")?.[1] ?? "";
    const resolved = attr || fromClass;
    if (resolved) setLang(resolved.toLowerCase());
  }, [lang]);

  const onCopy = () => {
    const code = preRef.current?.querySelector("code");
    if (!code) return;
    copyText(code.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const plain = !lang || ["text", "plain", "plaintext"].includes(lang);
  // plain 围栏 shiki 原样输出，没有 .line 可供计数/挂行号，就别加 with-lines
  const numbered = !plain && lineCount >= 4;

  return (
    <figure className={`code-block${numbered ? " with-lines" : ""}${plain ? " is-plain" : ""}`}>
      <figcaption className="code-head">
        {/* 认不出语言时统一落到 text，不显示空格子 */}
        <span className="code-lang">{plain ? "text" : lang}</span>
        <button
          type="button"
          onClick={onCopy}
          className="code-copy"
          aria-label={copied ? "已复制" : "复制代码"}
          title={copied ? "已复制" : "复制代码"}
        >
          {copied ? CHECK_ICON : COPY_ICON}
        </button>
      </figcaption>
      <pre ref={preRef} className="code-pre">
        {children}
      </pre>
    </figure>
  );
}
