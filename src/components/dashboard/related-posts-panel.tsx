"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  findRelatedPosts,
  type PostForSimilarity,
  type RelatedPostResult,
} from "@/lib/related-posts";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Link2,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function scoreColor(score: number): string {
  if (score >= 40) return "text-emerald-700 bg-emerald-50";
  if (score >= 20) return "text-sky-700 bg-sky-50";
  if (score >= 10) return "text-amber-700 bg-amber-50";
  return "text-muted-foreground bg-muted/40";
}

export function RelatedPostsPanel({
  currentPostId,
  title,
  tags,
  content,
  onInsertLink,
  className,
}: {
  currentPostId: string;
  title: string;
  tags: string;
  content: string;
  onInsertLink: (markdown: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<RelatedPostResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [insertedSlugs, setInsertedSlugs] = useState<Set<string>>(new Set());

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setExpanded(true);
    try {
      const res = await fetch("/api/posts?published=all", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const posts = (await res.json()) as Array<{
        id: string;
        title: string;
        slug: string;
        tags?: Array<{ name: string }>;
        content: string;
      }>;

      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const source: PostForSimilarity = {
        id: currentPostId,
        title,
        slug: "",
        tags: tagList,
        content,
      };
      const candidates: PostForSimilarity[] = posts
        .filter((p) => p.id !== currentPostId)
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          tags: (p.tags ?? []).map((t) => t.name),
          content: p.content,
        }));

      const related = findRelatedPosts(source, candidates, 6, 3);
      setResults(related);
      setInsertedSlugs(new Set());
      setHasScanned(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPostId, title, tags, content]);

  const handleInsert = (r: RelatedPostResult) => {
    onInsertLink(`[${r.title}](/blog/${r.slug})`);
    setInsertedSlugs((prev) => new Set(prev).add(r.slug));
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
          <Network className="h-3.5 w-3.5 text-sky-500" />
          <span className="text-foreground">Related posts</span>
          {hasScanned && results.length > 0 && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
              {results.length}
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
              <Network className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Analyzing..." : hasScanned ? "Re-analyze" : "Find related posts"}
          </Button>

          {results.length > 0 && (
            <ul className="space-y-1.5">
              {results.map((r) => {
                const inserted = insertedSlugs.has(r.slug);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-white/60 px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.reasons.length > 0 ? r.reasons.join(" · ") : "content overlap"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", scoreColor(r.score))}>
                        {r.score}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleInsert(r)}
                        disabled={inserted}
                        title={inserted ? "Link inserted" : "Insert link into content"}
                      >
                        <Link2 className={cn("h-3.5 w-3.5", inserted ? "text-emerald-500" : "text-muted-foreground")} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasScanned && results.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              No closely related posts found. Consider adding more tags or expanding your content.
            </p>
          )}

          {!hasScanned && !isLoading && (
            <p className="text-xs text-muted-foreground">
              Analyze your content to discover similar posts for cross-linking opportunities.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
