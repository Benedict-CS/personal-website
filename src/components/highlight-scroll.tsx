"use client";

import { useEffect } from "react";

/**
 * Scrolls to the first occurrence of the highlight term in the content (DOM order).
 * No preference for code vs prose — matches user expectation: snippet shows nginx.conf → jump to nginx.conf.
 */
export function HighlightScroll({
  highlight,
  contentSelector = "[data-post-content]",
}: {
  highlight: string | null | undefined;
  contentSelector?: string;
}) {
  useEffect(() => {
    if (!highlight || typeof highlight !== "string" || !highlight.trim()) return;

    const term = highlight.trim().toLowerCase();
    const timer = setTimeout(() => {
      const root = document.querySelector(contentSelector);
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || "";
        if (text.toLowerCase().includes(term)) {
          const el = node.parentElement;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [highlight, contentSelector]);

  return null;
}
