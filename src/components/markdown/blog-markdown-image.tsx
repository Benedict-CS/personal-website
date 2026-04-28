"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  /**
   * Optional parent-controlled lightbox handler. When omitted, the image hosts its
   * own modal so server-rendered markdown (public blog) keeps click-to-enlarge.
   */
  onOpenLightbox?: (src: string) => void;
};

/**
 * Image with optional aspect-ratio placeholder (from markdown title "WxH") to reduce layout shift.
 */
export function BlogMarkdownImage({ src, alt, title, className, onOpenLightbox }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [selfModalOpen, setSelfModalOpen] = useState(false);
  const dims = dimensionsFromImageTitle(title);
  const knownAspect = !!(dims.w && dims.h && dims.w > 0 && dims.h > 0);

  const titleDims = dims.w && dims.h ? { w: dims.w, h: dims.h } : null;
  const { cleanSrc, srcSet } = parseBlogImageUrl(typeof src === "string" ? src : "", titleDims);
  const finalSrc = cleanSrc || (typeof src === "string" ? src : "");

  /**
   * When the markdown image has no explicit WxH the previous fallback aspect ratio (16/10)
   * reserved more vertical space than the natural image needed, leaving a tall empty band
   * between the image and the following caption paragraph. Render naturally instead and
   * accept a small CLS for unsized images.
   */
  const wrapperStyle: React.CSSProperties | undefined = knownAspect
    ? { aspectRatio: `${dims.w} / ${dims.h}` }
    : undefined;

  const img = (
    <span
      className={cn(
        "relative block w-full",
        knownAspect && "bg-white",
        className
      )}
      style={wrapperStyle}
    >
      {knownAspect && !loaded && (
        <span
          className="absolute inset-0 block rounded bg-gradient-to-b from-muted to-muted-foreground/25"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        srcSet={srcSet || undefined}
        alt={alt ?? ""}
        title={dims.displayTitle ?? undefined}
        width={dims.w}
        height={dims.h}
        className={cn(
          "block w-full max-w-full transition-opacity duration-300",
          knownAspect ? "h-full object-contain" : "h-auto",
          knownAspect && !loaded && "opacity-0"
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        sizes="(max-width: 48rem) 100vw, min(70ch, 100vw)"
      />
    </span>
  );

  const handleOpen = () => {
    if (onOpenLightbox) {
      onOpenLightbox(finalSrc);
      return;
    }
    setSelfModalOpen(true);
  };

  useEffect(() => {
    if (!selfModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelfModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selfModalOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-block w-full cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Click to enlarge"
        aria-label={alt || "Open image preview"}
      >
        {img}
      </button>
      {selfModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
              onClick={() => setSelfModalOpen(false)}
            >
              <button
                type="button"
                className="absolute top-4 right-4 rounded-full bg-card/90 p-2 text-foreground hover:bg-card focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setSelfModalOpen(false)}
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span
                className="bg-white rounded shadow-2xl p-1 max-w-full max-h-[90vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={finalSrc}
                  srcSet={srcSet || undefined}
                  alt={alt || "Enlarged preview"}
                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                />
              </span>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
