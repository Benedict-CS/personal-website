"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Merge } from "lucide-react";

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
  const [isCleaning, setIsCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [mergeLoading, setMergeLoading] = useState<string | null>(null);
  const [mergeMessage, setMergeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/tags?all=1")
      .then((r) => r.json())
      .then((data) => setAllTags(Array.isArray(data) ? data : []))
      .catch(() => setAllTags([]));
  }, []);

  const handleCleanup = async () => {
    if (!confirm("Are you sure you want to clean up all tags with quotes? This will modify tag names in the database.")) {
      return;
    }

    setIsCleaning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/tags/cleanup", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Cleanup failed");
      }

      const data: CleanupResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error cleaning tags:", err);
      setError(err instanceof Error ? err.message : "Error occurred while cleaning tags");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleMerge = async (fromTagId: string, toTagId: string) => {
    if (!confirm("Move all posts from the first tag into the second, then delete the first tag. Continue?")) return;
    setMergeLoading(fromTagId);
    setMergeMessage(null);
    try {
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTagId, toTagId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Merge failed");
      setMergeMessage({ type: "success", text: data.message ?? "Tags merged." });
      setAllTags((prev) => prev.filter((t) => t.id !== fromTagId));
    } catch (e) {
      setMergeMessage({ type: "error", text: e instanceof Error ? e.message : "Merge failed" });
    } finally {
      setMergeLoading(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <p className="text-sm text-slate-600">
        Tags are created when you add them to posts.{" "}
        <Link href="/dashboard/posts" className="font-medium text-slate-900 hover:underline">
          Go to Posts
        </Link>
      </p>

      {allTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Merge tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Merge one tag into another: all posts get the target tag, then the source tag is removed.
            </p>
            {mergeMessage && (
              <p className={`text-sm mb-3 ${mergeMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>
                {mergeMessage.text}
              </p>
            )}
            <ul className="space-y-2">
              {allTags.map((tag) => (
                <li key={tag.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800">{tag.name}</span>
                  <span className="text-slate-400">→</span>
                  <select
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    disabled={mergeLoading !== null || allTags.length < 2}
                    onChange={(e) => {
                      const toId = e.target.value;
                      if (toId && toId !== tag.id) handleMerge(tag.id, toId);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Merge into...</option>
                    {allTags.filter((t) => t.id !== tag.id).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {mergeLoading === tag.id && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tag Management - Clean Up Quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 mb-1">Cleanup Instructions</h3>
                <p className="text-sm text-slate-600">
                  This feature will automatically clean up all quotes (single and double quotes) from tag names in the database.
                  If the cleaned tag name duplicates an existing tag, the system will automatically merge the tags.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="w-full sm:w-auto"
          >
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
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-2">
                    Cleanup Complete
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    {result.message}
                  </p>

                  {result.cleanedTags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-green-900 mb-2 text-sm">
                        Cleaned Tags:
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.cleanedTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 text-sm bg-white rounded p-2 border border-green-200"
                          >
                            <span className="text-slate-600 line-through">
                              {tag.oldName}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-green-700">
                              {tag.newName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-900 mb-2 text-sm">
                        Tags with Errors:
                      </h4>
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
