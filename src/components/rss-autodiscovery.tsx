"use client";

import { useEffect } from "react";

/**
 * Injects RSS feed link into document head for reader autodiscovery.
 * Next.js App Router does not expose a simple way to add arbitrary link tags via metadata.
 */
export function RssAutodiscovery() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = "/feed.xml";
    const existing = document.querySelector(`link[rel="alternate"][type="application/rss+xml"][href="${href}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = "RSS Feed";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);
  return null;
}
