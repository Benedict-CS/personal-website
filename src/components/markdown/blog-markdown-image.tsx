"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { parseBlogImageUrl } from "@/lib/blog-image-srcset-url";

export function dimensionsFromImageTitle(title?: string | null): { w?: number; h?: number; displayTitle?: string } {
  if (!title || typeof title !== "string") return {};
  const t = title.trim();
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(t);
  if (m) {
    return { w: Number(m[1]), h: Number(m[2]) };
  }
  return { displayTitle: t };
}

type Props = {
  src: string;
  alt?: string;
  title?: string | null;
  className?: string;
  onOpenLightbox?: (src: string) => void;
};

/**
 * Image with optional aspect-ratio placeholder (from markdown title "WxH") to reduce layout shift.
 */
export function BlogMarkdownImage({ src, alt, title, className, onOpenLightbox }: Props) {
  const [loaded, setLoaded] = useState(false);
  const dims = dimensionsFromImageTitle(title);
  const aspectRatio =
    dims.w && dims.h && dims.w > 0 && dims.h > 0 ? dims.w / dims.h : undefined;
  const fallbackAspectRatio = 16 / 10;

  const titleDims = dims.w && dims.h ? { w: dims.w, h: dims.h } : null;
  const { cleanSrc, srcSet } = parseBlogImageUrl(typeof src === "string" ? src : "", titleDims);

  const img = (
    <span
      className={cn("relative block w-full bg-white", className)}
      style={
        aspectRatio
          ? { aspectRatio: `${dims.w} / ${dims.h}` }
          : { aspectRatio: `${fallbackAspectRatio}` }
      }
    >
      {!loaded && (
        <span
          className="absolute inset-0 block rounded bg-gradient-to-b from-muted to-muted-foreground/25"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanSrc || src}
        srcSet={srcSet || undefined}
        alt={alt ?? ""}
        title={dims.displayTitle ?? undefined}
        width={dims.w}
        height={dims.h}
        className={cn(
          "block h-full w-full max-w-full object-contain transition-opacity duration-300",
          aspectRatio ? "object-contain" : "h-auto",
          !loaded && "opacity-0"
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        sizes="(max-width: 48rem) 100vw, min(70ch, 100vw)"
      />
    </span>
  );

  if (onOpenLightbox) {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox(cleanSrc || (typeof src === "string" ? src : ""))}
        className="inline-block w-full cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Click to enlarge"
      >
        {img}
      </button>
    );
  }

  return img;
}
