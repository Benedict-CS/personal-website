"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Replace, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";

type PreviewMatch = {
  postId: string;
  title: string;
  slug: string;
  occurrences: number;
  snippet: string | null;
};

/**
 * Phase 3 (autonomous): Bulk literal find/replace across all post bodies.
 * Gives power-users a Linear/Vercel-grade content migration tool without leaving the CMS.
 */
export function PostsOperationsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [preview, setPreview] = useState<{
    totalPostsScanned: number;
    affectedPosts: number;
    totalOccurrences: number;
    matches: PreviewMatch[];
  } | null>(null);

  const runPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/posts/content-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: "preview",
          find,
          replace,
          matchCase,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Preview failed", "error");
        return;
      }
      setPreview({
        totalPostsScanned: data.totalPostsScanned,
        affectedPosts: data.affectedPosts,
        totalOccurrences: data.totalOccurrences,
        matches: data.matches ?? [],
      });
      toast(
        data.affectedPosts === 0
          ? "No matches in post bodies"
          : `Found ${data.totalOccurrences} occurrence(s) in ${data.affectedPosts} post(s)`,
        data.affectedPosts === 0 ? "info" : "success"
      );
    } catch (e) {
      toast((e as Error).message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const runApply = async () => {
    setApplyOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/posts/content-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: "apply",
          find,
          replace,
          matchCase,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Replace failed", "error");
        return;
      }
      toast(`Updated ${data.updatedPosts} post(s)`, "success");
      setPreview(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const canApply = preview && preview.affectedPosts > 0 && find.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
          <Link href="/dashboard/posts">
            <ArrowLeft className="h-4 w-4" />
            Posts
          </Link>
        </Button>
      </div>

      <DashboardPageHeader
        title="Content find & replace"
        description="Search and replace literal text across all post bodies (Markdown / MDX). Run preview first, then apply. This is a string operation, not an AST — use it for URLs, typos, and renames."
      />

      <Card className="border-border shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
            Pattern
          </CardTitle>
          <CardDescription>Minimum 2 characters in &quot;Find&quot;.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="find" className="text-sm font-medium text-foreground">
                Find
              </label>
              <Input
                id="find"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="e.g. old-domain.com"
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="replace" className="text-sm font-medium text-foreground">
                Replace with
              </label>
              <Input
                id="replace"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder="e.g. new-domain.com"
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded border-border"
            />
            Match case
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runPreview} disabled={loading || find.trim().length < 2} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Preview matches
            </Button>
            <Button
              type="button"
              variant="default"
              className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={loading || !canApply}
              onClick={() => setApplyOpen(true)}
            >
              <Replace className="h-4 w-4" />
              Apply to database
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {preview && preview.matches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  Scanned {preview.totalPostsScanned} post(s) · {preview.affectedPosts} with matches ·{" "}
                  {preview.totalOccurrences} total occurrence(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {preview.matches.map((m) => (
                    <li
                      key={m.postId}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <div className="font-medium text-foreground">{m.title}</div>
                      <div className="text-xs text-muted-foreground">
                        /blog/{m.slug} · {m.occurrences}×
                      </div>
                      {m.snippet ? (
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                          {m.snippet}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply replacement?"
        description="This writes to the database immediately. Ensure you ran preview and the pattern is correct. Consider exporting a backup from the dashboard first."
        confirmLabel="Apply"
        variant="danger"
        onConfirm={runApply}
      />
    </div>
  );
}
