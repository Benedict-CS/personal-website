"use client";

import { useSearchParams } from "next/navigation";
import { HighlightScroll } from "@/components/highlight-scroll";

/**
 * Reads ?highlight= from URL and scrolls to the first occurrence in About page content.
 * Used when navigating from global search (e.g. NTUT -> About page with scroll to term).
 */
export function AboutHighlightScroll() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight") ?? undefined;
  return (
    <HighlightScroll
      highlight={highlight}
      contentSelector="[data-about-content]"
    />
  );
}
