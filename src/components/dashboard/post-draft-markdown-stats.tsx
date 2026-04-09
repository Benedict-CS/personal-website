"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { computePostDraftMarkdownStats } from "@/lib/cms-post-draft-stats";
import { DASHBOARD_META_LINE_CLASS } from "@/components/dashboard/dashboard-typography-classes";

export function PostDraftMarkdownStats({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const { words, lines, characters } = useMemo(
    () => computePostDraftMarkdownStats(markdown),
    [markdown]
  );

  return (
    <p className={cn(DASHBOARD_META_LINE_CLASS, className)} aria-live="polite">
      <span className="font-medium text-foreground">{words.toLocaleString("en-US")}</span> words ·{" "}
      <span className="font-medium text-foreground">{lines.toLocaleString("en-US")}</span> lines ·{" "}
      <span className="font-medium text-foreground">{characters.toLocaleString("en-US")}</span> characters
    </p>
  );
}
