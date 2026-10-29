import type { MDXComponents } from "mdx/types";
import { Children, isValidElement } from "react";
import Link from "next/link";
import LightboxImage from "@/components/lightbox-image";
import CodeBlock from "@/components/code-block";
import { parseImageMeta } from "@/lib/image-meta";

/**
 * MDX 渲染映射。
 *
 * 不传 components 时，正文里每个 <a> 都是裸锚点：站内链接整页刷新、站外链接
 * 在当前标签页把读者带走；表格在窄屏直接撑破容器。这些都在这里收口。
 */

const EXTERNAL = /^(?:https?:)?\/\//i;

const components = {
  img: ({ src, alt, ...props }) => {
    if (typeof src !== "string" || !src) {
      return <img src={src} alt={alt} loading="lazy" decoding="async" {...props} />;
    }
    // 图床把宽高挂在 URL fragment 上，取出来交给 <img>，图片下载前就占好位。
    const { src: cleanSrc, width, height } = parseImageMeta(src);
    return (
      <LightboxImage
        src={cleanSrc}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  },
  pre: ({ children, ...props }) => {
    // 语言与行数都从子节点 <code> 上取：<pre> 这层会被本组件替换，
    // shiki 写在 code 上的属性才是可靠来源（rehype-code-lang 已把它规范成 className）。
    const first = Children.toArray(children)[0];
    const isCode = isValidElement<{ className?: string | string[]; children?: React.ReactNode }>(first);
    const raw = isCode ? first.props.className : "";
    const classes = (Array.isArray(raw) ? raw.join(" ") : raw) ?? "";
    const attr = (props as Record<string, unknown>)["data-language"];
    const lang = /language-([\w+-]+)/.exec(classes)?.[1] ?? (typeof attr === "string" ? attr : undefined);
    // 只数元素：shiki 在行之间留有换行文本节点，Children.count 会把它算进去
    const lineCount = isCode
      ? Children.toArray(first.props.children).filter(isValidElement).length
      : 0;
    return (
      <CodeBlock lang={lang} lineCount={lineCount}>
        {children}
      </CodeBlock>
    );
  },
  a: ({ href = "", children, ...rest }) => {
    // 同页锚点保持原生行为（滚动 + 可复制链接）
    if (href.startsWith("#")) {
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      );
    }
    // 外链新开标签页，避免读者被带离站点后回不来
    if (EXTERNAL.test(href) || href.startsWith("mailto:")) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  },
  table: ({ children, ...rest }) => (
    <div className="table-scroll">
      <table {...rest}>{children}</table>
    </div>
  ),
  h2: ({ id, children, ...rest }) => (
    <h2 id={id} {...rest}>
      {children}
      {id ? (
        <a href={`#${id}`} className="heading-anchor" aria-label="本节链接">
          #
        </a>
      ) : null}
    </h2>
  ),
  h3: ({ id, children, ...rest }) => (
    <h3 id={id} {...rest}>
      {children}
      {id ? (
        <a href={`#${id}`} className="heading-anchor" aria-label="本节链接">
          #
        </a>
      ) : null}
    </h3>
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
