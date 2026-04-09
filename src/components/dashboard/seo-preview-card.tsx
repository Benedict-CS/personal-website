"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { analyzeSeo, type SeoGrade } from "@/lib/seo-preview";
import { ChevronDown, ChevronUp, Search, CircleCheck, CircleAlert, CircleMinus } from "lucide-react";

const GRADE_STYLES: Record<SeoGrade, { bg: string; text: string; ring: string }> = {
  Excellent: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  Good: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" },
  Fair: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  "Needs work": { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

function SignalIcon({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.8) return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  if (ratio >= 0.5) return <CircleMinus className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  return <CircleAlert className="h-3.5 w-3.5 shrink-0 text-rose-400" />;
}

export function SeoPreviewCard({
  title,
  slug,
  description,
  content,
  siteHost,
  className,
}: {
  title: string;
  slug: string;
  description: string;
  content: string;
  siteHost?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(
    () => analyzeSeo({ title, slug, description, content, siteHost }),
    [title, slug, description, content, siteHost]
  );

  const style = GRADE_STYLES[result.grade];

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 ring-1 transition-colors",
        style.bg,
        style.ring,
        "border-transparent",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <Search className={cn("h-3.5 w-3.5", style.text)} />
          <span className="text-foreground">SEO:</span>
          <span className={cn("font-semibold tabular-nums", style.text)}>{result.score}</span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              style.bg,
              style.text
            )}
          >
            {result.grade}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Google SERP Preview */}
          <div className="rounded-xl border border-border bg-white p-3 shadow-[var(--elevation-1)]">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Google Search Preview
            </p>
            <div className="space-y-0.5">
              <p className="text-sm text-[#1a0dab] line-clamp-1" style={{ fontFamily: "Arial, sans-serif" }}>
                {result.serp.title}
              </p>
              <p className="text-xs text-[#006621] line-clamp-1" style={{ fontFamily: "Arial, sans-serif" }}>
                {result.serp.url}
              </p>
              <p
                className="text-xs leading-relaxed text-[#545454] line-clamp-2"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {result.serp.description}
              </p>
            </div>
          </div>

          {/* Signal breakdown */}
          <div className="space-y-1.5">
            {result.signals.map((signal) => (
              <div key={signal.key} className="flex items-start gap-2 text-[11px] leading-relaxed">
                <SignalIcon score={signal.score} maxScore={signal.maxScore} />
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{signal.label}</span>
                  <span className="mx-1 text-muted-foreground/50">·</span>
                  <span className="text-muted-foreground">{signal.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
