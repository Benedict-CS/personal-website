"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/contexts/toast-context";
import type { PostRow } from "@/types/post";

type SortKey = "updatedAt" | "createdAt" | "title";
type Order = "asc" | "desc";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updatedAt_desc", label: "Last edited (newest)" },
  { value: "updatedAt_asc", label: "Last edited (oldest)" },
  { value: "createdAt_desc", label: "Created (newest)" },
  { value: "createdAt_asc", label: "Created (oldest)" },
  { value: "title_asc", label: "Title (A–Z)" },
  { value: "title_desc", label: "Title (Z–A)" },
];

export function PostsTableClient({
  posts,
  sort,
  order,
}: {
  posts: PostRow[];
  sort: SortKey;
  order: Order;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<"publish" | "unpublish" | "delete" | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditCategory, setBulkEditCategory] = useState("");
  const [bulkEditTags, setBulkEditTags] = useState("");
  const [bulkEditPublished, setBulkEditPublished] = useState<"" | "publish" | "unpublish">("");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    if (selected.size === 0) el.indeterminate = false;
    else if (selected.size === posts.length) el.indeterminate = false;
    else el.indeterminate = true;
  }, [selected.size, posts.length]);

  useEffect(() => {
    if (!bulkEditOpen) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBulkEditOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bulkEditOpen]);

  const buildUrl = (newSort: SortKey, newOrder: Order) => {
    const p = new URLSearchParams(searchParams);
    p.set("sort", newSort);
    p.set("order", newOrder);
    return `${pathname}?${p.toString()}`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === posts.length) setSelected(new Set());
    else setSelected(new Set(posts.map((p) => p.id)));
  };

  const handleDuplicate = async (postId: string) => {
    setDuplicatingId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/duplicate`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Duplicate failed", "error");
        return;
      }
      toast("Post duplicated as draft", "success");
      router.push(`/dashboard/posts/${data.id}`);
    } catch (e) {
      toast((e as Error).message || "Request failed", "error");
    } finally {
      setDuplicatingId(null);
    }
  };

  const runBulk = async (action: "publish" | "unpublish" | "delete") => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkConfirm(null);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Bulk action failed", "error");
        return;
      }
      toast(`${action} completed: ${data.updated} post(s)`, "success");
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast((e as Error).message || "Request failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkUpdate = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const payload: { action: string; ids: string[]; category?: string; tags?: string; published?: boolean } = {
      action: "update",
      ids,
    };
    if (bulkEditCategory !== "") payload.category = bulkEditCategory.trim() || undefined;
    if (bulkEditTags.trim()) payload.tags = bulkEditTags.trim();
    if (bulkEditPublished === "publish") payload.published = true;
    if (bulkEditPublished === "unpublish") payload.published = false;
    if (Object.keys(payload).length === 2) {
      toast("Set at least one field to update", "error");
      return;
    }
    setBulkEditOpen(false);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Bulk update failed", "error");
        return;
      }
      toast(`Updated ${data.updated} post(s)`, "success");
      setSelected(new Set());
      setBulkEditCategory("");
      setBulkEditTags("");
      setBulkEditPublished("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message || "Request failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkTitle =
    bulkConfirm === "delete"
      ? `Delete ${selected.size} post(s)?`
      : bulkConfirm === "publish"
        ? `Publish ${selected.size} post(s)?`
        : bulkConfirm === "unpublish"
          ? `Unpublish ${selected.size} post(s)?`
          : "";
  const bulkDesc =
    bulkConfirm === "delete"
      ? "This cannot be undone."
      : bulkConfirm
        ? ""
        : "";

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={bulkConfirm !== null}
        onClose={() => setBulkConfirm(null)}
        title={bulkTitle}
        description={bulkDesc}
        confirmLabel={bulkConfirm === "delete" ? "Delete" : bulkConfirm === "publish" ? "Publish" : "Unpublish"}
        variant={bulkConfirm === "delete" ? "danger" : "default"}
        onConfirm={() => bulkConfirm && runBulk(bulkConfirm)}
        loading={bulkLoading}
      />
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {selected.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkEditOpen(true)}
            disabled={bulkLoading}
          >
            Bulk edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkConfirm("publish")}
            disabled={bulkLoading}
          >
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkConfirm("unpublish")}
            disabled={bulkLoading}
          >
            Unpublish
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkConfirm("delete")}
            disabled={bulkLoading}
          >
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Bulk edit modal */}
      {bulkEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_265/0.4)] backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-title"
          onClick={() => setBulkEditOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-lg)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bulk-edit-title" className="text-lg font-semibold text-[var(--foreground)]">
              Bulk edit {selected.size} post(s)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Leave a field empty to keep current value.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="bulk-category" className="block text-sm font-medium text-[var(--foreground)]">Category</label>
                <input
                  id="bulk-category"
                  type="text"
                  value={bulkEditCategory}
                  onChange={(e) => setBulkEditCategory(e.target.value)}
                  placeholder="e.g. LeetCode/Array"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)]"
                />
              </div>
              <div>
                <label htmlFor="bulk-tags" className="block text-sm font-medium text-[var(--foreground)]">Tags (comma-separated)</label>
                <input
                  id="bulk-tags"
                  type="text"
                  value={bulkEditTags}
                  onChange={(e) => setBulkEditTags(e.target.value)}
                  placeholder="tag1, tag2"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)]"
                />
              </div>
              <div>
                <label htmlFor="bulk-published" className="block text-sm font-medium text-[var(--foreground)]">Published</label>
                <select
                  id="bulk-published"
                  value={bulkEditPublished}
                  onChange={(e) => setBulkEditPublished((e.target.value || "") as "" | "publish" | "unpublish")}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)]"
                >
                  <option value="">No change</option>
                  <option value="publish">Publish</option>
                  <option value="unpublish">Unpublish</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkEditOpen(false)} disabled={bulkLoading}>
                Cancel
              </Button>
              <Button onClick={runBulkUpdate} disabled={bulkLoading}>
                {bulkLoading ? "..." : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-[var(--muted-foreground)]">Sort:</label>
        <select
          value={`${sort}_${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split("_") as [SortKey, Order];
            router.push(buildUrl(s, o));
          }}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-[var(--shadow-sm)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-card overflow-x-auto shadow-[var(--shadow-sm)]">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[var(--border)]">
              <TableHead className="w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={posts.length > 0 && selected.size === posts.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Published Status</TableHead>
              <TableHead>Published Date</TableHead>
              <TableHead>Last Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id} className="transition-[background-color] duration-150 hover:bg-[var(--accent)]/50 border-[var(--border)]">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    className="h-4 w-4 rounded border-input"
                    aria-label={`Select ${post.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-[var(--foreground)]">{post.title}</TableCell>
                <TableCell>
                  {post.published ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                      Draft
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-[var(--muted-foreground)]">{formatDate(post.createdAt)}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(post.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <a
                      href={post.published ? `/blog/${post.slug}` : `/dashboard/notes/${post.slug}`}
                      className="inline-flex"
                    >
                      <Button variant="ghost" size="sm" title={post.published ? "View on site" : "Preview as note"}>
                        View
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Duplicate as draft"
                      disabled={duplicatingId === post.id}
                      onClick={() => handleDuplicate(post.id)}
                      className="gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {duplicatingId === post.id ? "..." : "Duplicate"}
                    </Button>
                    <Link href={`/dashboard/posts/${post.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl border border-[var(--border)] bg-card p-4 shadow-[var(--shadow-sm)] flex flex-col gap-3 transition-shadow duration-200 hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleOne(post.id)}
                className="h-4 w-4 mt-1 rounded border-input"
                aria-label={`Select ${post.title}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--foreground)] truncate">{post.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--muted-foreground)]">
                  {post.published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">Published</span>
                  ) : (
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 font-medium text-[var(--muted-foreground)]">Draft</span>
                  )}
                  <span>{formatDate(post.updatedAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={post.published ? `/blog/${post.slug}` : `/dashboard/notes/${post.slug}`}>
                <Button variant="ghost" size="sm">View</Button>
              </a>
              <Button variant="ghost" size="sm" disabled={duplicatingId === post.id} onClick={() => handleDuplicate(post.id)} className="gap-1">
                <Copy className="h-3.5 w-3.5" />
                {duplicatingId === post.id ? "..." : "Duplicate"}
              </Button>
              <Link href={`/dashboard/posts/${post.id}`}>
                <Button variant="ghost" size="sm">Edit</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
