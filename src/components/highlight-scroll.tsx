"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls to the Nth occurrence of the highlight term (1-based).
 * Retries so the last occurrence (end of long content) is found after DOM is fully rendered.
 */
export function HighlightScroll({
  highlight,
  occurrence: occurrenceParam,
  contentSelector = "[data-post-content]",
}: {
  highlight: string | null | undefined;
  occurrence?: number | string | null;
  contentSelector?: string;
}) {
  const occurrence = typeof occurrenceParam === "string" ? parseInt(occurrenceParam, 10) : occurrenceParam;
  const targetIndex = typeof occurrence === "number" && occurrence >= 1 ? occurrence - 1 : 0;
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (!highlight || typeof highlight !== "string" || !highlight.trim()) return;
    scrolledRef.current = false;

    const term = highlight.trim().toLowerCase();

    function tryScroll() {
      if (scrolledRef.current) return;
      const root = document.querySelector(contentSelector);
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      let count = 0;
      let lastMatchEl: Element | null = null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || "";
        if (!text.toLowerCase().includes(term)) continue;
        lastMatchEl = node.parentElement;
        if (count === targetIndex) {
          lastMatchEl?.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolledRef.current = true;
          return;
        }
        count++;
      }
      if (!scrolledRef.current && lastMatchEl) {
        lastMatchEl.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolledRef.current = true;
      }
    }

    const t1 = setTimeout(tryScroll, 400);
    const t2 = setTimeout(tryScroll, 1000);
    const t3 = setTimeout(tryScroll, 2000);
    const t4 = setTimeout(tryScroll, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [highlight, targetIndex, contentSelector]);

  return null;
}
