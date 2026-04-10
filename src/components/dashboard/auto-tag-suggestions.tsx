"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { suggestTags, type ExistingTag, type TagSuggestion } from "@/lib/auto-tag-suggest";
import { Tag, Sparkles, Plus, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AutoTagSuggestions({
  postId,
  title,
  content,
  currentTags,
  onAddTag,
  className,
}: {
  postId?: string;
  title: string;
  content: string;
  currentTags: string;
  onAddTag: (tagName: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setExpanded(true);
    try {
      let result: TagSuggestion[] = [];
      if (postId) {
        const suggestionRes = await fetch(`/api/posts/${postId}/tag-suggestions`, {
          credentials: "include",
          cache: "no-store",
        });
        if (suggestionRes.ok) {
          const data = (await suggestionRes.json()) as { suggestions?: TagSuggestion[] };
          result = Array.isArray(data.suggestions) ? data.suggestions : [];
        }
      }
      if (result.length === 0) {
        const res = await fetch("/api/tags", { credentials: "include" });
        const allTags: ExistingTag[] = res.ok
          ? ((await res.json()) as Array<{ name: string; slug: string }>).map((t) => ({
              name: t.name,
              slug: t.slug,
            }))
          : [];
        result = suggestTags(title, content, allTags, currentTags);
      }
      setSuggestions(result);
      setAddedTags(new Set());
      setHasScanned(true);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [content, currentTags, postId, title]);

  const handleAdd = (suggestion: TagSuggestion) => {
    onAddTag(suggestion.tag);
    setAddedTags((prev) => new Set(prev).add(suggestion.tag));
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
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-foreground">Tag suggestions</span>
          {hasScanned && suggestions.length > 0 && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              {suggestions.length}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleScan()}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Tag className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Analyzing..." : hasScanned ? "Re-analyze" : "Analyze content for tags"}
          </Button>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => {
                const wasAdded = addedTags.has(s.tag);
                return (
                  <button
                    key={s.tag}
                    type="button"
                    onClick={() => !wasAdded && handleAdd(s)}
                    disabled={wasAdded}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      wasAdded
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                        : s.isExisting
                          ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                          : "border-border bg-card text-foreground hover:bg-muted/40"
                    )}
                    title={s.reason}
                  >
                    {wasAdded ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {s.tag}
                    {s.isExisting && !wasAdded && (
                      <span className="text-[10px] text-violet-500">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {hasScanned && suggestions.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              No tag suggestions for this content. Try adding more specific terms to your title or body.
            </p>
          )}

          {!hasScanned && !isLoading && (
            <p className="text-xs text-muted-foreground">
              Scan your content to get AI-free tag suggestions based on keyword frequency and existing tags.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
