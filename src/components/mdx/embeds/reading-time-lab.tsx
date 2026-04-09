"use client";

import { useMemo, useState } from "react";
import { getContentMetrics } from "@/lib/content-metrics";

type ReadingTimeLabProps = {
  title?: string;
  seedText?: string;
};

export function ReadingTimeLab({
  title = "Reading Time Lab",
  seedText = "Paste or write content here to estimate word count and reading time.",
}: ReadingTimeLabProps) {
  const [text, setText] = useState(seedText);
  const metrics = useMemo(() => getContentMetrics(text), [text]);

  return (
    <div className="not-prose my-8 rounded-xl border border-border bg-card shadow-[var(--elevation-1)]">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{metrics.words} words</span>
      </div>
      <div className="space-y-3 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[140px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
          aria-label="Reading time lab input"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            Reading time: {metrics.readingLabel}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            Characters: {text.length}
          </span>
        </div>
      </div>
    </div>
  );
}
