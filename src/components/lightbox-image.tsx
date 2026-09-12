"use client";

import { useLightbox } from "./lightbox-provider";

interface LightboxImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  wrapperClassName?: string;
}

export default function LightboxImage({
  src,
  alt,
  className,
  wrapperClassName,
  ...rest
}: LightboxImageProps) {
  const { open } = useLightbox();

  if (typeof src !== "string" || !src) {
    return <img src={src} alt={alt} className={className} {...rest} />;
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => open(src)}
      className={wrapperClassName ?? "contents"}
      aria-label={alt || "查看图片"}
    >
      <img src={src} alt={alt} className={className} {...rest} />
    </button>
  );
}