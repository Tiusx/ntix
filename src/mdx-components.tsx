import type { MDXComponents } from "mdx/types";
import LightboxImage from "@/components/lightbox-image";
import CodeBlock from "@/components/code-block";

const components = {
  img: ({ src, alt, ...props }) => (
    <LightboxImage src={src} alt={alt} {...props} />
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}