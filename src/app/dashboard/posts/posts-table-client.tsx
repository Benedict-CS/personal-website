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

type SortKey = "updatedAt" | "createdAt" | "title";
type Order = "asc" | "desc";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  tags: { name: string; slug: string }[];
};

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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    if (selected.size === 0) el.indeterminate = false;
    else if (selected.size === posts.length) el.indeterminate = false;
    else el.indeterminate = true;
  }, [selected.size, posts.length]);

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
      const res = await fetch(`/api/posts/${postId}/duplicate`, { method: "POST" });
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
          <span className="text-sm font-medium text-slate-700">
            {selected.size} selected
          </span>
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

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-600">Sort:</label>
        <select
          value={`${sort}_${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split("_") as [SortKey, Order];
            router.push(buildUrl(s, o));
          }}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={posts.length > 0 && selected.size === posts.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300"
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
              <TableRow key={post.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Select ${post.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  {post.published ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      Draft
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatDate(post.createdAt)}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(post.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <a
                      href={post.published ? `/blog/${post.slug}` : `/dashboard/notes/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
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
    </div>
  );
}
