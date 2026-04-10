"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Merge, Search } from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";
import { DASHBOARD_NATIVE_SELECT_CLASS } from "@/components/dashboard/dashboard-form-classes";
import {
  DashboardEmptyState,
  DashboardPageHeader,
  dashboardCardClassName,
} from "@/components/dashboard/dashboard-ui";
import { useCmsSync } from "@/contexts/cms-sync-context";

interface CleanedTag {
  id: string;
  oldName: string;
  newName: string;
}

interface CleanupResult {
  cleanedCount: number;
  cleanedTags: CleanedTag[];
  errors?: string[];
  message: string;
}

interface TagRow {
  id: string;
  name: string;
  slug: string;
}

export default function TagsPage() {
  const { toast } = useToast();
  const { publish } = useCmsSync();
  const [tagsLoading, setTagsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [mergeLoading, setMergeLoading] = useState<string | null>(null);
  const [mergeMessage, setMergeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState<{
    fromTagId: string;
    toTagId: string;
    fromName: string;
    toName: string;
  } | null>(null);
  const [tagFilter, setTagFilter] = useState("");

  const sortedTags = useMemo(
    () => [...allTags].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [allTags]
  );

  const displayedTags = useMemo(() => {
    const q = tagFilter.trim().toLowerCase();
    if (!q) return sortedTags;
    return sortedTags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [sortedTags, tagFilter]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags?all=1", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load tags");
        return r.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!cancelled) setAllTags(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAllTags([]);
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runCleanup = async () => {
    setCleanupConfirmOpen(false);
    setIsCleaning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/tags/cleanup", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Cleanup failed");
      }

      const data: CleanupResult = await response.json();
      setResult(data);
      toast(data.message || "Tag cleanup finished.", "success");
      publish("tags");
      fetch("/api/tags?all=1", { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error("reload failed");
          return r.json() as Promise<unknown>;
        })
        .then((tags) => setAllTags(Array.isArray(tags) ? tags : []))
        .catch(() => {});
    } catch (err) {
      console.error("Error cleaning tags:", err);
      const msg = err instanceof Error ? err.message : "Error occurred while cleaning tags";
      setError(msg);
      toast(msg, "error");
    } finally {
      setIsCleaning(false);
    }
  };

  const runMerge = async () => {
    if (!mergeConfirm) return;
    const { fromTagId, toTagId, fromName, toName } = mergeConfirm;
    const tagsSnapshot = allTags;
    setMergeConfirm(null);
    setMergeLoading(fromTagId);
    setMergeMessage(null);
    setAllTags((prev) => prev.filter((t) => t.id !== fromTagId));
    try {
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromTagId, toTagId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Merge failed");
      setMergeMessage({ type: "success", text: data.message ?? "Tags merged." });
      toast(`Merged “${fromName}” into “${toName}”.`, "success");
      publish("tags");
    } catch (e) {
      setAllTags(tagsSnapshot);
      setMergeMessage({ type: "error", text: e instanceof Error ? e.message : "Merge failed" });
      toast(e instanceof Error ? e.message : "Merge failed", "error");
      fetch("/api/tags?all=1", { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error("reload failed");
          return r.json() as Promise<unknown>;
        })
        .then((data) => setAllTags(Array.isArray(data) ? data : []))
        .catch(() => {});
    } finally {
      setMergeLoading(null);
    }
  };

  if (tagsLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6" role="status" aria-busy="true" aria-label="Loading tags">
        <SkeletonLine className="h-5 w-full max-w-xl" />
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
          <SkeletonLine className="mb-3 h-6 w-40" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLine key={i} className="h-10 w-full max-w-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <DashboardPageHeader
        eyebrow="Blog"
        title="Tags"
        description={
          <>
            Tags are created when you add them to posts.{" "}
            <Link
              href="/dashboard/posts"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Go to Posts
            </Link>
          </>
        }
      />
      <ConfirmDialog
        open={cleanupConfirmOpen}
        onClose={() => setCleanupConfirmOpen(false)}
        title="Clean up tag quotes?"
        description="This will remove single and double quotes from tag names in the database. Duplicate names may be merged automatically."
        confirmLabel="Start cleanup"
        variant="danger"
        onConfirm={runCleanup}
        loading={isCleaning}
      />
      <ConfirmDialog
        open={mergeConfirm !== null}
        onClose={() => setMergeConfirm(null)}
        title="Merge tags?"
        description={
          mergeConfirm
            ? `Move all posts from “${mergeConfirm.fromName}” into “${mergeConfirm.toName}”, then delete “${mergeConfirm.fromName}”.`
            : undefined
        }
        confirmLabel="Merge"
        variant="danger"
        onConfirm={runMerge}
        loading={mergeLoading !== null}
      />

      {allTags.length === 0 ? (
        <DashboardEmptyState
          illustration="tags"
          title="No tags yet"
          description="Tags are created when you add them to posts. Open an article, add tags in the editor, then return here to merge or clean them up."
          className="py-10"
        >
          <Button asChild>
            <Link href="/dashboard/posts">Go to Posts</Link>
          </Button>
        </DashboardEmptyState>
      ) : (
        <Card className={dashboardCardClassName()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Merge className="h-5 w-5" />
              Merge tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Merge one tag into another: all posts get the target tag, then the source tag is removed.
            </p>
            {mergeMessage && (
              <p
                className={`text-sm mb-3 ${mergeMessage.type === "success" ? "text-emerald-800" : "text-red-700"}`}
              >
                {mergeMessage.text}
              </p>
            )}
            <div className="relative mb-4 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder="Filter by name or slug…"
                className="h-9 pl-9"
                aria-label="Filter tags"
              />
            </div>
            {displayedTags.length === 0 ? (
              <DashboardEmptyState
                illustration="magnifier"
                title="No tags match your filter"
                description="Try another name or slug, or clear the search field."
                className="border-dashed py-8"
              />
            ) : (
              <ul className="space-y-2">
                {displayedTags.map((tag) => (
                  <li key={tag.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{tag.name}</span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      className={DASHBOARD_NATIVE_SELECT_CLASS}
                      disabled={mergeLoading !== null || allTags.length < 2}
                      onChange={(e) => {
                        const toId = e.target.value;
                        if (toId && toId !== tag.id) {
                          const target = allTags.find((t) => t.id === toId);
                          if (target) {
                            setMergeConfirm({
                              fromTagId: tag.id,
                              toTagId: toId,
                              fromName: tag.name,
                              toName: target.name,
                            });
                          }
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Merge into...</option>
                      {sortedTags
                        .filter((t) => t.id !== tag.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    {mergeLoading === tag.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={dashboardCardClassName()}>
        <CardHeader>
          <CardTitle className="text-foreground">Tag Management — Clean Up Quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 font-medium text-foreground">Cleanup instructions</h3>
                <p className="text-sm text-muted-foreground">
                  This feature will automatically clean up all quotes (single and double quotes) from tag names in the
                  database. If the cleaned tag name duplicates an existing tag, the system will automatically merge the
                  tags.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => setCleanupConfirmOpen(true)} disabled={isCleaning} className="w-full sm:w-auto">
            {isCleaning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              "Start Cleaning Tags"
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-emerald-900 mb-2">Cleanup complete</h3>
                  <p className="text-sm text-emerald-800 mb-4">{result.message}</p>

                  {result.cleanedTags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-emerald-900 mb-2 text-sm">Cleaned tags</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.cleanedTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 rounded border border-emerald-200 bg-card p-2 text-sm"
                          >
                            <span className="text-muted-foreground line-through">{tag.oldName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-emerald-800">{tag.newName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-900 mb-2 text-sm">Tags with errors</h4>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
