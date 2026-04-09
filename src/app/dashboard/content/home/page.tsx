"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Pencil,
  FileText,
  LayoutTemplate,
  Rss,
  Award,
  Eye,
  EyeOff,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";

const BUILTIN_IDS = ["hero", "latestPosts", "skills"] as const;
const BUILTIN_LABELS: Record<string, string> = {
  hero: "Hero",
  latestPosts: "Latest posts",
  skills: "Skills",
};

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  skills?: string[];
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  customSections?: Record<string, { title?: string; content: string }>;
  [key: string]: unknown;
};

const defaultContent: HomeContent = {
  sectionOrder: [...BUILTIN_IDS],
  sectionVisibility: {},
  customSections: {},
};

function nextMarkdownId(customSections: Record<string, { title?: string; content: string }>): string {
  let n = 1;
  while (customSections[`markdown_${n}`]) n++;
  return `markdown_${n}`;
}

export default function DashboardHomeSectionsPage() {
  const [content, setContent] = useState<HomeContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", content: "" });

  const sectionOrder = Array.isArray(content.sectionOrder) ? content.sectionOrder : [...BUILTIN_IDS];
  const customSections = content.customSections ?? {};
  const sectionVisibility = content.sectionVisibility ?? {};

  const toggleVisible = (id: string) => {
    setContent((c) => {
      const vis = c.sectionVisibility ?? {};
      const currentlyHidden = vis[id] === false;
      return { ...c, sectionVisibility: { ...vis, [id]: currentlyHidden } };
    });
  };

  useEffect(() => {
    fetch("/api/site-content?page=home", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setContent({
            ...defaultContent,
            ...data,
            sectionOrder: Array.isArray(data.sectionOrder) ? data.sectionOrder : defaultContent.sectionOrder,
            sectionVisibility: data.sectionVisibility && typeof data.sectionVisibility === "object" ? data.sectionVisibility : {},
            customSections: data.customSections && typeof data.customSections === "object" ? data.customSections : {},
          });
        } else {
          setContent({ ...defaultContent });
        }
      })
      .catch(() => setContent({ ...defaultContent }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const currentRes = await fetch("/api/site-content?page=home", { credentials: "include" });
      const current = await currentRes.json().catch(() => null);
      const base = current && typeof current === "object" ? current : {};
      const payload = {
        ...base,
        sectionOrder: content.sectionOrder ?? base.sectionOrder ?? [...BUILTIN_IDS],
        sectionVisibility: content.sectionVisibility ?? base.sectionVisibility ?? {},
        customSections: content.customSections ?? base.customSections ?? {},
      };
      const res = await fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ page: "home", content: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save");
      }
      setMessage({
        type: "success",
        text: "Home sections saved.",
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const id = nextMarkdownId(customSections);
    setContent((c) => ({
      ...c,
      sectionOrder: [...(c.sectionOrder ?? []), id],
      customSections: { ...(c.customSections ?? {}), [id]: { title: "New section", content: "" } },
    }));
    setEditingId(id);
    setEditDraft({ title: "New section", content: "" });
    requestAnimationFrame(() => {
      document.getElementById("home-section-edit-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const removeSection = (id: string) => {
    if (BUILTIN_IDS.includes(id as (typeof BUILTIN_IDS)[number])) return;
    setContent((c) => {
      const nextOrder = (c.sectionOrder ?? []).filter((x) => x !== id);
      const nextCustom = { ...(c.customSections ?? {}) };
      delete nextCustom[id];
      return { ...c, sectionOrder: nextOrder, customSections: nextCustom };
    });
    if (editingId === id) setEditingId(null);
  };

  const moveSection = (index: number, dir: 1 | -1) => {
    const next = [...sectionOrder];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setContent((c) => ({ ...c, sectionOrder: next }));
  };

  const startEdit = (id: string) => {
    if (id.startsWith("markdown_") && customSections[id]) {
      setEditingId(id);
      setEditDraft({
        title: customSections[id].title ?? "",
        content: customSections[id].content ?? "",
      });
    }
  };

  const saveEdit = () => {
    if (!editingId || !editingId.startsWith("markdown_")) return;
    setContent((c) => ({
      ...c,
      customSections: {
        ...(c.customSections ?? {}),
        [editingId]: { title: editDraft.title.trim() || undefined, content: editDraft.content },
      },
    }));
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 px-2 sm:px-0 max-w-4xl" role="status" aria-busy="true" aria-label="Loading home content">
        <div className="h-10 w-64 rounded-lg skeleton-shimmer" />
        <div className="h-5 w-full max-w-md rounded-lg skeleton-shimmer" />
        <div className="rounded-xl border border-border p-4 shadow-[var(--elevation-1)] space-y-3">
          <div className="h-5 w-48 rounded-lg skeleton-shimmer" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0 max-w-4xl">
      <DashboardPageHeader
        eyebrow="Home"
        title="Home page sections"
        description="Add, remove, and reorder sections. Edit hero, skills, and latest posts in the visual editor."
      >
        <Button onClick={addSection} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add section
        </Button>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/editor/home">
            <ExternalLink className="h-4 w-4" />
            Visual editor
          </Link>
        </Button>
      </DashboardPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section order</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Use <strong>Add section</strong> to add a custom Markdown block. Use Move up / Move down to reorder. Built-in sections (Hero, Latest posts, Skills) can only be edited in the visual editor.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {sectionOrder.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No sections. Click &quot;Add section&quot; to add one.</p>
          ) : null}
          {sectionOrder.map((id, index) => {
            const isBuiltin = BUILTIN_IDS.includes(id as (typeof BUILTIN_IDS)[number]);
            const label = isBuiltin
              ? BUILTIN_LABELS[id]
              : customSections[id]?.title || id;
            const Icon = id === "hero" ? LayoutTemplate : id === "latestPosts" ? Rss : id === "skills" ? Award : FileText;
            const isVisible = sectionVisibility[id] !== false;

            return (
              <div
                key={id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 min-w-0 ${isVisible ? "border-border bg-card" : "border-amber-200 bg-amber-50/50"}`}
              >
                <div className="flex items-center gap-1 shrink-0 order-first">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sectionOrder.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{label}</span>
                {isBuiltin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => toggleVisible(id)}
                    title={isVisible ? "Hide on home page" : "Show on home page"}
                    aria-label={isVisible ? "Hide section" : "Show section"}
                  >
                    {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-amber-600" />}
                    <span className="text-xs">{isVisible ? "Visible" : "Hidden"}</span>
                  </Button>
                )}
                <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                  {isBuiltin ? (
                    <Link href="/editor/home">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => startEdit(id)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                  {!isBuiltin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => removeSection(id)}
                      title="Remove section"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-border">
            <Button onClick={addSection} variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingId && editingId.startsWith("markdown_") && (
        <Card id="home-section-edit-card" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-base">Edit section: {editingId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Section title (optional)</Label>
              <Input
                id="edit-title"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. About this site"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Markdown content</Label>
              <Textarea
                id="edit-content"
                value={editDraft.content}
                onChange={(e) => setEditDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder="Write in **Markdown**..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit}>Apply</Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          <p>{message.text}</p>
          {message.type === "success" && (
            <a href="/" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium underline">
              View home page →
            </a>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save sections"}
        </Button>
      </div>
    </div>
  );
}
