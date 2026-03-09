"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CustomPageItem = {
  id: string;
  slug: string;
  title: string;
  order: number;
  published: boolean;
  scheduledPublishAt?: string | null;
  effectivePublished?: boolean;
  updatedAt?: string;
};

type PageTemplate = {
  id: string;
  label: string;
  description: string;
  defaultTitle: string;
  defaultSlug: string;
  content: string;
};

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "about-pro",
    label: "About / Profile",
    description: "Personal story, expertise, and call to action.",
    defaultTitle: "About Me",
    defaultSlug: "about-me",
    content: `# About Me

## Intro
Write a short intro in 2-3 lines so visitors understand who you are.

## What I Do
- Service or skill 1
- Service or skill 2
- Service or skill 3

## Why Work With Me
Add trust points, years of experience, and outcomes.

## Contact
Add one clear next step (email form, booking link, or social profile).`,
  },
  {
    id: "services",
    label: "Services",
    description: "Clear offer page with pricing-style sections.",
    defaultTitle: "Services",
    defaultSlug: "services",
    content: `# Services

## Main Offer
Describe your core service and the business result it creates.

## Packages
### Starter
- Includes:
- Delivery time:
- Best for:

### Growth
- Includes:
- Delivery time:
- Best for:

### Premium
- Includes:
- Delivery time:
- Best for:

## FAQ
- Question 1
- Question 2
- Question 3`,
  },
  {
    id: "landing",
    label: "Landing Page",
    description: "Marketing layout for campaigns and product launches.",
    defaultTitle: "Landing",
    defaultSlug: "landing",
    content: `# Build Your Next Project Faster

## Hero
One sentence value proposition and one primary call to action.

## Benefits
- Benefit 1
- Benefit 2
- Benefit 3

## Social Proof
Add logos, testimonials, or user metrics.

## Final CTA
Repeat one strong call to action.`,
  },
  {
    id: "contact",
    label: "Contact",
    description: "Simple page with contact methods and FAQs.",
    defaultTitle: "Contact",
    defaultSlug: "contact-us",
    content: `# Contact

## Let's Talk
Tell visitors how quickly you reply and what details to include.

## Contact Methods
- Email:
- LinkedIn:
- Phone:

## FAQ Before Contact
- What services are available?
- Typical timeline?
- Budget range?`,
  },
];

export default function CustomPagesPage() {
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<CustomPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const slugify = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const nextAvailableSlug = (base: string): string => {
    const normalized = slugify(base) || "page";
    const existing = new Set(pages.map((p) => p.slug));
    if (!existing.has(normalized)) return normalized;
    let i = 2;
    while (existing.has(`${normalized}-${i}`)) i += 1;
    return `${normalized}-${i}`;
  };

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
        scheduledPublishAt:
          typeof p.scheduledPublishAt === "string" && p.scheduledPublishAt
            ? p.scheduledPublishAt
            : null,
        effectivePublished: p.effectivePublished === true || p.published !== false,
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : undefined,
      }))
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => setMessage({ type: "error", text: "Failed to load custom pages." }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const paramStatus = searchParams.get("status");
    const paramQ = searchParams.get("q");
    if (paramStatus === "published" || paramStatus === "draft" || paramStatus === "all") {
      setStatusFilter(paramStatus);
    }
    if (typeof paramQ === "string") {
      setSearchQuery(paramQ);
    }
  }, [searchParams]);

  const createPage = async () => {
    const slug = slugify(newSlug);
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

  const createPageFromTemplate = async (template: PageTemplate) => {
    setCreating(true);
    setMessage(null);
    try {
      const title = template.defaultTitle.trim();
      const slug = nextAvailableSlug(template.defaultSlug);
      const res = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          content: template.content,
          published: false,
          order: pages.length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create template page");
      }
      await refresh();
      setMessage({
        type: "success",
        text: `Template "${template.label}" created. Open builder to customize it.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create template page.",
      });
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
          scheduledPublishAt: page.scheduledPublishAt ?? null,
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

  const reorderPages = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= pages.length || toIndex >= pages.length) return;
    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const normalized = next.map((page, index) => ({ ...page, order: index }));
    setPages(normalized);
    setReordering(true);
    setMessage(null);
    try {
      const res = await fetch("/api/custom-pages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: normalized.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error("Failed to reorder custom pages");
      setMessage({ type: "success", text: "Custom page order updated." });
    } catch (error) {
      await refresh();
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to reorder custom pages." });
    } finally {
      setReordering(false);
    }
  };

  const duplicatePage = async (page: CustomPageItem) => {
    setDuplicatingId(page.id);
    setMessage(null);
    try {
      const detailRes = await fetch(`/api/custom-pages/slug/${encodeURIComponent(page.slug)}`, { cache: "no-store" });
      const detail = detailRes.ok ? ((await detailRes.json()) as { content?: string }) : {};
      const slug = nextAvailableSlug(`${page.slug}-copy`);
      const title = `${page.title} (Copy)`;
      const createRes = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          content: typeof detail.content === "string" ? detail.content : "",
          published: false,
          order: pages.length,
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to duplicate page");
      await refresh();
      setMessage({ type: "success", text: `Duplicated "${page.title}".` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to duplicate page." });
    } finally {
      setDuplicatingId(null);
    }
  };

  const createPreviewLink = async (page: CustomPageItem) => {
    setPreviewingId(page.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/custom-pages/id/${page.id}/preview-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlSeconds: 60 * 60 * 24 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.previewUrl) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create preview link");
      }
      const url = String(data.previewUrl);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage({ type: "success", text: "Preview link copied to clipboard." });
      } else {
        setMessage({ type: "success", text: `Preview link: ${url}` });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create preview link.",
      });
    } finally {
      setPreviewingId(null);
    }
  };

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pages.filter((page) => {
      const passStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
            ? (page.effectivePublished ?? page.published)
            : !(page.effectivePublished ?? page.published);
      const passQuery = !q || page.title.toLowerCase().includes(q) || page.slug.toLowerCase().includes(q);
      return passStatus && passQuery;
    });
  }, [pages, searchQuery, statusFilter]);

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
          <CardTitle>Quick start templates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {PAGE_TEMPLATES.map((template) => (
            <div key={template.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{template.label}</p>
              <p className="mt-1 text-xs text-slate-600">{template.description}</p>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                disabled={creating}
                onClick={() => void createPageFromTemplate(template)}
              >
                {creating ? "Creating..." : "Use template"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All custom pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or slug"
            />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={statusFilter === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("published")}
              >
                Published
              </Button>
              <Button
                type="button"
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                Draft
              </Button>
            </div>
            <div className="text-xs text-slate-600 md:text-right">
              Showing {filteredPages.length} of {pages.length} pages
            </div>
          </div>
          {pages.length === 0 ? (
            <p className="text-sm text-slate-500">No custom pages yet.</p>
          ) : filteredPages.length === 0 ? (
            <p className="text-sm text-slate-500">No pages match your current filters.</p>
          ) : (
            filteredPages.map((page) => {
              const index = pages.findIndex((item) => item.id === page.id);
              return (
              <div key={page.id} className="rounded-lg border border-slate-200 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] md:items-center">
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
                  <span className="text-xs text-slate-600">
                    Live: {(page.effectivePublished ?? page.published) ? "Yes" : "No"}
                  </span>
                  <Input
                    type="datetime-local"
                    value={page.scheduledPublishAt ? new Date(page.scheduledPublishAt).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setPages((current) =>
                        current.map((item) =>
                          item.id === page.id
                            ? {
                                ...item,
                                scheduledPublishAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                              }
                            : item
                        )
                      )
                    }
                    title="Scheduled publish time (optional)"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPages((current) =>
                        current.map((item) => (item.id === page.id ? { ...item, scheduledPublishAt: null } : item))
                      )
                    }
                    disabled={!page.scheduledPublishAt}
                  >
                    Clear schedule
                  </Button>
                  <Link href={`/editor/page/${encodeURIComponent(page.slug)}`}>
                    <Button variant="outline" size="sm">Open builder</Button>
                  </Link>
                  <a href={`/page/${encodeURIComponent(page.slug)}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">View</Button>
                  </a>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reordering || index <= 0}
                      onClick={() => void reorderPages(index, index - 1)}
                    >
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reordering || index >= pages.length - 1}
                      onClick={() => void reorderPages(index, index + 1)}
                    >
                      Down
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {page.updatedAt ? `Last updated: ${new Date(page.updatedAt).toLocaleString()}` : "Not saved yet"}
                    {page.scheduledPublishAt ? ` • Scheduled: ${new Date(page.scheduledPublishAt).toLocaleString()}` : ""}
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
                      variant="outline"
                      size="sm"
                      onClick={() => void duplicatePage(page)}
                      disabled={duplicatingId === page.id}
                    >
                      {duplicatingId === page.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void createPreviewLink(page)}
                      disabled={previewingId === page.id}
                    >
                      {previewingId === page.id ? "Generating..." : "Preview link"}
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
            );
            })
          )}
        </CardContent>
      </Card>

      {message && <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>}
    </div>
  );
}

