"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { listTemplates, applyTemplate, type AppliedTemplate } from "@/lib/post-templates";
import {
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PostTemplateSelector({
  onApply,
  hasContent,
  className,
}: {
  onApply: (result: AppliedTemplate) => void;
  hasContent: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(!hasContent);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const templates = listTemplates();

  const handleApply = (templateId: string) => {
    const result = applyTemplate(templateId);
    if (!result) return;
    onApply(result);
    setAppliedId(templateId);
    setTimeout(() => setAppliedId(null), 2000);
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
          <LayoutTemplate className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-foreground">Start from a template</span>
          {!hasContent && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              recommended
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const isApplied = appliedId === t.id;
            return (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                onClick={() => handleApply(t.id)}
                disabled={isApplied}
                className={cn(
                  "h-auto flex-col items-start gap-1 px-3 py-2.5 text-left whitespace-normal",
                  isApplied && "border-emerald-300 bg-emerald-50"
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="flex-1 text-xs font-medium text-foreground">{t.name}</span>
                  {isApplied && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                </span>
                <span className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                  {t.description}
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {expanded && hasContent && (
        <p className="mt-2 text-[10px] text-amber-600">
          Applying a template will replace the current content, tags, and description.
        </p>
      )}
    </div>
  );
}
