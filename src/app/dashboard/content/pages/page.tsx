"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FilePlus2, LayoutTemplate, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { SocialShareCardControls } from "@/components/dashboard/social-share-card-controls";
import { formatAbsoluteDateTime, formatRelativeTime } from "@/lib/relative-time";
import {
  sanitizeSlugForStorage,
  validateCustomPageDraft,
  validateNewCustomPageInput,
} from "@/lib/editor-validation";

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

const TACTILE_ACTION_CLASS =
  "transition-transform duration-150 active:scale-[0.98] motion-safe:hover:-translate-y-px";

function normalizeCustomPageItem(p: Partial<CustomPageItem>): CustomPageItem {
  return {
    id: String(p.id ?? ""),
    slug: String(p.slug ?? ""),
    title: String(p.title ?? ""),
    order: Number.isFinite(Number(p.order)) ? Number(p.order) : 0,
    published: p.published !== false,
    scheduledPublishAt:
      typeof p.scheduledPublishAt === "string" && p.scheduledPublishAt ? p.scheduledPublishAt : null,
    effectivePublished: p.effectivePublished === true || p.published !== false,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : undefined,
  };
}

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
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<CustomPageItem | null>(null);
  const [selectedSharePageId, setSelectedSharePageId] = useState("");

  const slugify = (value: string): string => sanitizeSlugForStorage(value);

  const nextAvailableSlug = (base: string): string => {
    const normalized = slugify(base) || "page";
    const existing = new Set(pages.map((p) => p.slug));
    if (!existing.has(normalized)) return normalized;
    let i = 2;
    while (existing.has(`${normalized}-${i}`)) i += 1;
    return `${normalized}-${i}`;
  };

  const refresh = async () => {
    const res = await fetch("/api/custom-pages", { cache: "no-store", credentials: "include" });
    if (!res.ok) throw new Error("Failed to load custom pages");
    const raw = (await res.json()) as CustomPageItem[];
    const safe = Array.isArray(raw) ? raw : [];
    setPages(safe.map((p) => normalizeCustomPageItem(p)));
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
    const validation = validateNewCustomPageInput({ title, slug }, existingSlugs);
    if (!validation.valid) {
      setMessage({
        type: "error",
        text: validation.errors.title || validation.errors.slug || "Please fix validation errors.",
      });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      const created = normalizeCustomPageItem(data as Partial<CustomPageItem>);
      setNewSlug("");
      setNewTitle("");
      setPages((current) => [...current, { ...created, order: current.length }]);
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
        credentials: "include",
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
      const created = normalizeCustomPageItem(data as Partial<CustomPageItem>);
      setPages((current) => [...current, { ...created, order: current.length }]);
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
    const otherSlugs = new Set(
      pages
        .filter((item) => item.id !== page.id)
        .map((item) => sanitizeSlugForStorage(item.slug))
    );
    const validation = validateCustomPageDraft({
      title: page.title,
      slug: page.slug,
      content: "Validation placeholder text for metadata save only.",
      existingSlugs: otherSlugs,
      currentSlug: sanitizeSlugForStorage(page.slug),
    });
    if (!validation.valid) {
      setMessage({
        type: "error",
        text: validation.errors.title || validation.errors.slug || "Please fix row validation errors before saving.",
      });
      return;
    }
    setSavingId(page.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/custom-pages/id/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: sanitizeSlugForStorage(page.slug),
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
      const updated = normalizeCustomPageItem(data as Partial<CustomPageItem>);
      setPages((current) => current.map((item) => (item.id === page.id ? { ...item, ...updated } : item)));
      setMessage({ type: "success", text: `Saved "${page.title || page.slug}".` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save custom page." });
    } finally {
      setSavingId(null);
    }
  };

  const confirmDeletePage = async () => {
    const page = deleteConfirmPage;
    if (!page) return;
    setDeleteConfirmPage(null);
    setDeletingId(page.id);
    setMessage(null);
    const snapshot = pages;
    setPages((current) => current.filter((item) => item.id !== page.id));
    try {
      const res = await fetch(`/api/custom-pages/id/${page.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete custom page");
      setMessage({ type: "success", text: `Deleted "${page.title || page.slug}".` });
    } catch (error) {
      setPages(snapshot);
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
        credentials: "include",
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
      const detailRes = await fetch(`/api/custom-pages/slug/${encodeURIComponent(page.slug)}`, { cache: "no-store", credentials: "include" });
      const detail = detailRes.ok ? ((await detailRes.json()) as { content?: string }) : {};
      const slug = nextAvailableSlug(`${page.slug}-copy`);
      const title = `${page.title} (Copy)`;
      const createRes = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      const created = normalizeCustomPageItem(data as Partial<CustomPageItem>);
      setPages((current) => [...current, { ...created, order: current.length }]);
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
  const existingSlugs = useMemo(() => new Set(pages.map((page) => sanitizeSlugForStorage(page.slug))), [pages]);
  const selectedSharePage = useMemo(
    () => pages.find((page) => page.id === selectedSharePageId) ?? pages[0] ?? null,
    [pages, selectedSharePageId]
  );
  const createValidation = useMemo(
    () => validateNewCustomPageInput({ title: newTitle, slug: newSlug }, existingSlugs),
    [existingSlugs, newSlug, newTitle]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-44 rounded-lg skeleton-shimmer" />
        <Card>
          <CardHeader>
            <CardTitle>Loading custom pages…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-10 w-full rounded-lg skeleton-shimmer" />
            <div className="h-10 w-full rounded-lg skeleton-shimmer" />
            <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteConfirmPage !== null}
        onClose={() => setDeleteConfirmPage(null)}
        title="Delete custom page?"
        description={
          deleteConfirmPage
            ? `“${deleteConfirmPage.title || deleteConfirmPage.slug}” will be removed permanently. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void confirmDeletePage()}
        loading={false}
      />
      <div className="space-y-3">
        <DashboardPageHeader
          eyebrow="Pages"
          title="Custom pages"
          description="Manage additional pages separate from core site settings."
        />
        <details className="max-w-3xl rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground/90">
          <summary className="cursor-pointer select-none font-medium text-foreground">
            URLs, preview, and responsive layout
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>
              <strong className="text-foreground">Public URL:</strong> <code className="rounded bg-card px-1 text-xs">/page/your-slug</code>{" "}
              — responsive by default (Tailwind + site layout).
            </li>
            <li>
              <strong className="text-foreground">Editor:</strong> use <strong>Open builder</strong> for the visual block
              editor; publish when ready.
            </li>
            <li>
              <strong className="text-foreground">Shareable preview:</strong> generate a time-limited link (copies to
              clipboard) for reviewers without a login.
            </li>
            <li>
              <strong className="text-foreground">Templates:</strong> quick-start Markdown bodies; refine blocks in the
              builder.
            </li>
          </ul>
        </details>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create custom page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g. Portfolio)"
              aria-invalid={Boolean(createValidation.errors.title)}
            />
            <Input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              onBlur={() => setNewSlug((current) => sanitizeSlugForStorage(current))}
              placeholder="Slug (e.g. portfolio)"
              aria-invalid={Boolean(createValidation.errors.slug)}
            />
            <Button
              className={TACTILE_ACTION_CLASS}
              onClick={() => void createPage()}
              disabled={creating || !createValidation.valid}
              title={!createValidation.valid ? createValidation.errors.title || createValidation.errors.slug : undefined}
            >
              {creating ? "Creating..." : "Create page"}
            </Button>
          </div>
          {createValidation.errors.title ? (
            <p className="text-xs text-rose-700">{createValidation.errors.title}</p>
          ) : null}
          {createValidation.errors.slug ? (
            <p className="text-xs text-rose-700">{createValidation.errors.slug}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social share card generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pages.length > 0 ? (
            <>
              <div className="max-w-xs">
                <label htmlFor="share-page-select" className="mb-1 block text-xs text-muted-foreground">
                  Target page
                </label>
                <select
                  id="share-page-select"
                  value={selectedSharePage?.id ?? ""}
                  onChange={(e) => setSelectedSharePageId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground shadow-[var(--elevation-1)]"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title || page.slug}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSharePage ? (
                <SocialShareCardControls
                  title={selectedSharePage.title || selectedSharePage.slug}
                  subtitle={`/page/${selectedSharePage.slug}`}
                  label="Custom Page"
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create a page first to generate share card assets.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" aria-hidden />
            Quick start templates
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {PAGE_TEMPLATES.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              whileHover={{ y: -2 }}
              className="rounded-lg border border-border p-3"
            >
              <p className="text-sm font-semibold text-foreground">{template.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
              <Button
                className={`mt-3 ${TACTILE_ACTION_CLASS}`}
                variant="outline"
                size="sm"
                disabled={creating}
                onClick={() => void createPageFromTemplate(template)}
              >
                {creating ? "Creating..." : "Use template"}
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All custom pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_auto_auto]">
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
                className={TACTILE_ACTION_CLASS}
              >
                All
              </Button>
              <Button
                type="button"
                variant={statusFilter === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("published")}
                className={TACTILE_ACTION_CLASS}
              >
                Published
              </Button>
              <Button
                type="button"
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
                className={TACTILE_ACTION_CLASS}
              >
                Draft
              </Button>
            </div>
            <div className="text-xs text-muted-foreground md:text-right">
              Showing {filteredPages.length} of {pages.length} pages
            </div>
          </div>
          {pages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <FilePlus2 className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">No custom pages yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create one above (title + slug) or use a template, then edit content in the visual editor.</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <SearchX className="h-4.5 w-4.5" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">No pages match your filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Adjust status/search filters or clear your query.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredPages.map((page) => {
              const index = pages.findIndex((item) => item.id === page.id);
              const rowValidation = validateCustomPageDraft({
                title: page.title,
                slug: page.slug,
                content: "Validation placeholder text for metadata save only.",
                existingSlugs: new Set(
                  pages
                    .filter((item) => item.id !== page.id)
                    .map((item) => sanitizeSlugForStorage(item.slug))
                ),
                currentSlug: sanitizeSlugForStorage(page.slug),
              });
              return (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                whileHover={{ y: -1 }}
                className="rounded-lg border border-border p-3"
              >
                <div className="grid gap-2 xl:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] xl:items-center">
                  <Input
                    value={page.title}
                    onChange={(e) =>
                      setPages((current) =>
                        current.map((item) => (item.id === page.id ? { ...item, title: e.target.value } : item))
                      )
                    }
                    placeholder="Page title"
                    aria-invalid={Boolean(rowValidation.errors.title)}
                  />
                  <Input
                    value={page.slug}
                    onChange={(e) =>
                      setPages((current) =>
                        current.map((item) => (item.id === page.id ? { ...item, slug: e.target.value } : item))
                      )
                    }
                    placeholder="Slug"
                    onBlur={() =>
                      setPages((current) =>
                        current.map((item) =>
                          item.id === page.id ? { ...item, slug: sanitizeSlugForStorage(item.slug) } : item
                        )
                      )
                    }
                    aria-invalid={Boolean(rowValidation.errors.slug)}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-foreground/90">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input bg-card accent-primary focus:ring-2 focus:ring-ring"
                      checked={page.published}
                      onChange={(e) =>
                        setPages((current) =>
                          current.map((item) => (item.id === page.id ? { ...item, published: e.target.checked } : item))
                        )
                      }
                    />
                    Published
                  </label>
                  <span className="text-xs text-muted-foreground">
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
                    className={TACTILE_ACTION_CLASS}
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
                    <Button variant="outline" size="sm" className={TACTILE_ACTION_CLASS}>Open builder</Button>
                  </Link>
                  <a href={`/page/${encodeURIComponent(page.slug)}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className={TACTILE_ACTION_CLASS}>View</Button>
                  </a>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      disabled={reordering || index <= 0}
                      onClick={() => void reorderPages(index, index - 1)}
                    >
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      disabled={reordering || index >= pages.length - 1}
                      onClick={() => void reorderPages(index, index + 1)}
                    >
                      Down
                    </Button>
                  </div>
                </div>
                {!rowValidation.valid ? (
                  <p className="mt-2 text-xs text-rose-700" role="status" aria-live="polite">
                    {rowValidation.errors.title || rowValidation.errors.slug}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {page.updatedAt ? (
                      <>
                        Last updated{" "}
                        <span className="tabular-nums" title={formatAbsoluteDateTime(page.updatedAt)}>
                          {formatRelativeTime(page.updatedAt)}
                        </span>
                      </>
                    ) : (
                      "Not saved yet"
                    )}
                    {page.scheduledPublishAt
                      ? ` • Scheduled: ${formatAbsoluteDateTime(page.scheduledPublishAt)}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      onClick={() => void saveMeta(page)}
                      disabled={savingId === page.id || !rowValidation.valid}
                    >
                      {savingId === page.id ? "Saving..." : "Save meta"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      onClick={() => void duplicatePage(page)}
                      disabled={duplicatingId === page.id}
                    >
                      {duplicatingId === page.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      onClick={() => void createPreviewLink(page)}
                      disabled={previewingId === page.id}
                    >
                      {previewingId === page.id ? "Generating..." : "Preview link"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className={TACTILE_ACTION_CLASS}
                      onClick={() => setDeleteConfirmPage(page)}
                      disabled={deletingId === page.id}
                    >
                      {deletingId === page.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
            })}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {message && (
        <p role="status" aria-live="polite" className={message.type === "success" ? "text-green-600" : "text-red-600"}>
          {message.text}
        </p>
      )}
    </div>
  );
}

