"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Loader2 } from "lucide-react";
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
import { useCmsSync } from "@/contexts/cms-sync-context";
import type { PostRow } from "@/types/post";
import { formatAbsoluteDateTime, formatRelativeTime } from "@/lib/relative-time";
import { UI_MODAL_OVERLAY_CLASS, UI_MODAL_PANEL_CLASS, UI_MOTION_EASE } from "@/components/ui/ui-cohesion";

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
  const { revisions } = useCmsSync();
  const lastTagRevision = useRef(revisions.tags);
  /** Optimistic list; resets when server `posts` change after refresh. */
  const [listPosts, setListPosts] = useState<PostRow[]>(posts);
  useEffect(() => {
    setListPosts(posts);
  }, [posts]);
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
    else if (selected.size === listPosts.length) el.indeterminate = false;
    else el.indeterminate = true;
  }, [selected.size, listPosts.length]);

  useEffect(() => {
    if (revisions.tags === lastTagRevision.current) return;
    lastTagRevision.current = revisions.tags;
    router.refresh();
  }, [revisions.tags, router]);

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

  const toggleHeaderSort = (key: SortKey) => {
    const nextOrder: Order = sort === key && order === "desc" ? "asc" : "desc";
    router.push(buildUrl(key, nextOrder));
  };

  const sortIndicator = (key: SortKey) => {
    if (sort !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />;
    return order === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" aria-hidden />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" aria-hidden />;
  };

  const isPostPublic = (post: PostRow) => {
    if (post.published) return true;
    if (!post.publishedAt) return false;
    return new Date(post.publishedAt) <= new Date();
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === listPosts.length) setSelected(new Set());
    else setSelected(new Set(listPosts.map((p) => p.id)));
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

  const applyOptimisticBulk = (action: "publish" | "unpublish" | "delete", ids: string[]) => {
    const idSet = new Set(ids);
    setListPosts((prev) => {
      if (action === "delete") return prev.filter((p) => !idSet.has(p.id));
      if (action === "unpublish") return prev.filter((p) => !idSet.has(p.id));
      return prev.map((p) => (idSet.has(p.id) ? { ...p, published: true } : p));
    });
    setSelected(new Set());
  };

  const runBulk = async (action: "publish" | "unpublish" | "delete") => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkConfirm(null);
    applyOptimisticBulk(action, ids);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListPosts(posts);
        setSelected(new Set(ids));
        toast(data.error || "Bulk action failed", "error");
        return;
      }
      toast(`${action} completed: ${data.updated} post(s)`, "success");
      router.refresh();
    } catch (e) {
      setListPosts(posts);
      setSelected(new Set(ids));
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
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
          className={UI_MODAL_OVERLAY_CLASS}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-title"
          onClick={() => setBulkEditOpen(false)}
        >
          <div
            className={`${UI_MODAL_PANEL_CLASS} max-h-[90vh] overflow-y-auto`}
            style={{ transitionTimingFunction: `cubic-bezier(${UI_MOTION_EASE.join(",")})` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bulk-edit-title" className="text-lg font-semibold text-foreground">
              Bulk edit {selected.size} post(s)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Leave a field empty to keep current value.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="bulk-category" className="block text-sm font-medium text-foreground">Category</label>
                <input
                  id="bulk-category"
                  type="text"
                  autoFocus
                  value={bulkEditCategory}
                  onChange={(e) => setBulkEditCategory(e.target.value)}
                  placeholder="e.g. LeetCode/Array"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--elevation-1)]"
                />
              </div>
              <div>
                <label htmlFor="bulk-tags" className="block text-sm font-medium text-foreground">Tags (comma-separated)</label>
                <input
                  id="bulk-tags"
                  type="text"
                  value={bulkEditTags}
                  onChange={(e) => setBulkEditTags(e.target.value)}
                  placeholder="tag1, tag2"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--elevation-1)]"
                />
              </div>
              <div>
                <label htmlFor="bulk-published" className="block text-sm font-medium text-foreground">Published</label>
                <select
                  id="bulk-published"
                  value={bulkEditPublished}
                  onChange={(e) => setBulkEditPublished((e.target.value || "") as "" | "publish" | "unpublish")}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--elevation-1)]"
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
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {bulkLoading ? "Applying..." : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-muted-foreground">Sort:</label>
        <select
          value={`${sort}_${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split("_") as [SortKey, Order];
            router.push(buildUrl(s, o));
          }}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-[var(--elevation-1)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto shadow-[var(--elevation-1)]">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={listPosts.length > 0 && selected.size === listPosts.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                  onClick={() => toggleHeaderSort("title")}
                >
                  Title
                  {sortIndicator("title")}
                </button>
              </TableHead>
              <TableHead className="w-[min(11rem,22vw)] max-w-[13rem]">Slug</TableHead>
              <TableHead className="w-[min(12rem,26vw)] max-w-[14rem]">Category</TableHead>
              <TableHead>Published Status</TableHead>
              <TableHead className="text-right tabular-nums">Views</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                  onClick={() => toggleHeaderSort("createdAt")}
                >
                  Published Date
                  {sortIndicator("createdAt")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                  onClick={() => toggleHeaderSort("updatedAt")}
                >
                  Last Edited
                  {sortIndicator("updatedAt")}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listPosts.map((post) => (
              <TableRow key={post.id} className="transition-[background-color] duration-150 hover:bg-accent/50 border-border">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    className="h-4 w-4 rounded border-input"
                    aria-label={`Select ${post.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{post.title}</TableCell>
                <TableCell
                  className="max-w-[13rem] truncate font-mono text-xs text-muted-foreground"
                  title={post.slug}
                >
                  {post.slug}
                </TableCell>
                <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground" title={post.category ?? ""}>
                  {post.category || "—"}
                </TableCell>
                <TableCell>
                  {post.published ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Draft
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {isPostPublic(post) ? (post.viewCount ?? 0).toLocaleString() : "—"}
                </TableCell>
                <TableCell
                  className="text-muted-foreground"
                  title={formatAbsoluteDateTime(post.createdAt)}
                >
                  <span className="tabular-nums">{formatRelativeTime(post.createdAt)}</span>
                </TableCell>
                <TableCell
                  className="text-xs text-muted-foreground"
                  title={formatAbsoluteDateTime(post.updatedAt)}
                >
                  <span className="tabular-nums">{formatRelativeTime(post.updatedAt)}</span>
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
        {listPosts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-1)] flex flex-col gap-3 transition-[box-shadow] duration-200 hover:shadow-[var(--elevation-2)]"
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
                <p className="font-medium text-foreground truncate">{post.title}</p>
                <p
                  className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                  title={post.slug}
                >
                  {post.slug}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                    {post.category || "Uncategorized"}
                  </span>
                  {post.published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">Published</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">Draft</span>
                  )}
                  {isPostPublic(post) && (
                    <span className="tabular-nums">{(post.viewCount ?? 0).toLocaleString()} views</span>
                  )}
                  <span title={formatAbsoluteDateTime(post.updatedAt)} className="tabular-nums">
                    Edited {formatRelativeTime(post.updatedAt)}
                  </span>
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
