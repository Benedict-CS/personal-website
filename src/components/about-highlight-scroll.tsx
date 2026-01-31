"use client";

import { useSearchParams } from "next/navigation";
import { HighlightScroll } from "@/components/highlight-scroll";

/**
 * Reads ?highlight= and ?occurrence= from URL and scrolls to that occurrence in About page content.
 */
export function AboutHighlightScroll() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight") ?? undefined;
  const occurrence = searchParams.get("occurrence") ?? undefined;
  return (
    <HighlightScroll
      highlight={highlight}
      occurrence={occurrence}
      contentSelector="[data-about-content]"
    />
  );
}
