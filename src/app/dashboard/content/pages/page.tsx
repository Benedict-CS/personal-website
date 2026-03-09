"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CustomPageItem = {
  id: string;
  slug: string;
  title: string;
  order: number;
  published: boolean;
  updatedAt?: string;
};

export default function CustomPagesPage() {
  const [pages, setPages] = useState<CustomPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/custom-pages", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load custom pages");
    const raw = (await res.json()) as CustomPageItem[];
    const safe = Array.isArray(raw) ? raw : [];
    setPages(
      safe.map((p) => ({
        id: String(p.id ?? ""),
        slug: String(p.slug ?? ""),
        title: String(p.title ?? ""),
        order: Number.isFinite(Number(p.order)) ? Number(p.order) : 0,
        published: p.published !== false,
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : undefined,
      }))
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => setMessage({ type: "error", text: "Failed to load custom pages." }))
      .finally(() => setLoading(false));
  }, []);

  const createPage = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const title = newTitle.trim();
    if (!slug || !title) {
      setMessage({ type: "error", text: "Slug and title are required." });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          content: "",
          published: false,
          order: pages.length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create custom page");
      }
      setNewSlug("");
      setNewTitle("");
      await refresh();
      setMessage({ type: "success", text: "Custom page created." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to create custom page." });
    } finally {
      setCreating(false);
    }
  };

  const saveMeta = async (page: CustomPageItem) => {
    setSavingId(page.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/custom-pages/id/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: page.slug,
          title: page.title,
          published: page.published,
          order: page.order,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save custom page");
      }
      await refresh();
      setMessage({ type: "success", text: `Saved "${page.title || page.slug}".` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save custom page." });
    } finally {
      setSavingId(null);
    }
  };

  const deletePage = async (page: CustomPageItem) => {
    if (!window.confirm(`Delete custom page "${page.title || page.slug}"? This cannot be undone.`)) return;
    setDeletingId(page.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/custom-pages/id/${page.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete custom page");
      await refresh();
      setMessage({ type: "success", text: `Deleted "${page.title || page.slug}".` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete custom page." });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p className="text-slate-600">Loading custom pages...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Custom pages</h2>
        <p className="mt-1 text-slate-600">Manage additional pages separate from core site settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create custom page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (e.g. Portfolio)"
          />
          <Input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="Slug (e.g. portfolio)"
          />
          <Button onClick={() => void createPage()} disabled={creating}>
            {creating ? "Creating..." : "Create page"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All custom pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pages.length === 0 ? (
            <p className="text-sm text-slate-500">No custom pages yet.</p>
          ) : (
            pages.map((page) => (
              <div key={page.id} className="rounded-lg border border-slate-200 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center">
                  <Input
                    value={page.title}
                    onChange={(e) =>
                      setPages((current) =>
                        current.map((item) => (item.id === page.id ? { ...item, title: e.target.value } : item))
                      )
                    }
                    placeholder="Page title"
                  />
                  <Input
                    value={page.slug}
                    onChange={(e) =>
                      setPages((current) =>
                        current.map((item) => (item.id === page.id ? { ...item, slug: e.target.value } : item))
                      )
                    }
                    placeholder="Slug"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={page.published}
                      onChange={(e) =>
                        setPages((current) =>
                          current.map((item) => (item.id === page.id ? { ...item, published: e.target.checked } : item))
                        )
                      }
                    />
                    Published
                  </label>
                  <Link href={`/editor/page/${encodeURIComponent(page.slug)}`}>
                    <Button variant="outline" size="sm">Open editor</Button>
                  </Link>
                  <a href={`/page/${encodeURIComponent(page.slug)}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">View</Button>
                  </a>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {page.updatedAt ? `Last updated: ${new Date(page.updatedAt).toLocaleString()}` : "Not saved yet"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void saveMeta(page)}
                      disabled={savingId === page.id}
                    >
                      {savingId === page.id ? "Saving..." : "Save meta"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void deletePage(page)}
                      disabled={deletingId === page.id}
                    >
                      {deletingId === page.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {message && <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>}
    </div>
  );
}

