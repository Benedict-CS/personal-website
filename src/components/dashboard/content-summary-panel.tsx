"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { summarizeContent, type SummarySentence } from "@/lib/content-summarizer";
import {
  ChevronDown,
  ChevronUp,
  Wand2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContentSummaryPanel({
  title,
  content,
  currentDescription,
  onUseDescription,
  className,
}: {
  title: string;
  content: string;
  currentDescription: string;
  onUseDescription: (text: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [usedSuggested, setUsedSuggested] = useState(false);

  const result = useMemo(
    () => summarizeContent(title, content),
    [title, content]
  );

  const hasSuggestion = result.suggested.length > 0;
  const descriptionIsEmpty = currentDescription.trim().length === 0;

  const handleUseSuggested = () => {
    onUseDescription(result.suggested);
    setUsedSuggested(true);
    setTimeout(() => setUsedSuggested(false), 2000);
  };

  const handleUseCandidate = (sentence: SummarySentence) => {
    onUseDescription(sentence.text.length > 155
      ? sentence.text.slice(0, 154).trimEnd() + "\u2026"
      : sentence.text
    );
    setCopiedIndex(sentence.index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <Wand2 className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-foreground">Auto-summary</span>
          {hasSuggestion && descriptionIsEmpty && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              suggestion available
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Suggested meta description */}
          {hasSuggestion ? (
            <div className="rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                    Suggested meta description
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/90">
                    {result.suggested}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {result.suggested.length} chars
                    {result.suggested.length > 155 ? " (will be truncated)" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseSuggested}
                  disabled={usedSuggested}
                  className="shrink-0 gap-1.5"
                >
                  {usedSuggested ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {usedSuggested ? "Applied" : "Use this"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Write more content to generate summary suggestions. The engine needs at least a few complete sentences.
            </p>
          )}

          {/* Additional candidates */}
          {result.candidates.length > 1 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Alternative sentences
              </p>
              <ul className="space-y-1">
                {result.candidates.slice(0, 4).map((c) => (
                  <li
                    key={c.index}
                    className="flex items-start gap-2 rounded-md bg-white/60 px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-relaxed text-foreground/80 line-clamp-2">
                        {c.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUseCandidate(c)}
                      className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      title="Use as description"
                    >
                      {copiedIndex === c.index ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
