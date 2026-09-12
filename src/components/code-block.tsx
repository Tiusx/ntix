"use client";

import { useEffect, useRef, useState } from "react";

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

export default function CodeBlock({ children }: { children?: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState("");

  useEffect(() => {
    const code = preRef.current?.querySelector("code");
    const m = /language-([\w+-]+)/.exec(code?.className ?? "");
    setLang(m ? m[1] : "");
  }, []);

  const onCopy = () => {
    const code = preRef.current?.querySelector("code");
    if (!code) return;
    copyText(code.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <figure className="group/code relative my-6">
      <figcaption className="flex items-center justify-between rounded-t-xl border border-b-0 border-line bg-card px-4 py-2">
        <span className="font-mono text-xs text-sub uppercase">{lang}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-sub transition-colors hover:text-ink"
          aria-label="复制代码"
        >
          {copied ? CHECK_ICON : COPY_ICON}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </figcaption>
      <pre
        ref={preRef}
        className="overflow-x-auto rounded-b-xl bg-card p-4 [scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]"
      >
        {children}
      </pre>
    </figure>
  );
}