"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ExternalLink, GripVertical, ImageIcon, Link2 } from "lucide-react";
import { FieldHelp } from "@/components/ui/field-help";
import Link from "next/link";
import { useToast } from "@/contexts/toast-context";
import { InsertMediaModal } from "@/components/insert-media-modal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type CustomPageRow = { id: string; slug: string; title: string; order: number; published: boolean; updatedAt: string };

function SortablePageItem({
  page,
  onEdit,
  onRemove,
  onTogglePublished,
  togglingId,
}: {
  page: CustomPageRow;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublished: (id: string) => void;
  togglingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 last:border-0 ${isDragging ? "z-20 opacity-95 shadow-lg rounded-md bg-white border border-slate-200" : ""}`}
    >
      <button type="button" className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-600" {...attributes} {...listeners} aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-medium text-slate-800">{page.title}</span>
      <span className="text-slate-500 text-sm">/page/{page.slug}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onTogglePublished(page.id)}
        disabled={togglingId !== null}
        className={page.published ? "text-green-700 border-green-200" : "text-amber-700 border-amber-200"}
        title={page.published ? "Public — click to set Draft" : "Draft — click to set Public"}
      >
        {page.published ? "Public" : "Draft"}
      </Button>
      <Link href={`/page/${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-700">
        <ExternalLink className="h-4 w-4" />
      </Link>
      <Button variant="ghost" size="sm" onClick={() => onEdit(page.id)}>Edit</Button>
      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemove(page.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

export default function CustomPagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<CustomPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", content: "" });
  const [formContent, setFormContent] = useState("");
  const [insertMediaFor, setInsertMediaFor] = useState<"image" | "button" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    try {
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/custom-pages`;
      const res = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const contentType = res.headers.get("content-type") ?? "";
      let data: unknown = [];
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => []);
      }
      const list = Array.isArray(data) ? data : [];
      setPages(list.map((p: CustomPageRow & { published?: boolean }) => ({
        id: String(p.id),
        slug: String(p.slug),
        title: String(p.title),
        order: typeof p.order === "number" ? p.order : 0,
        published: typeof p.published === "boolean" ? p.published : true,
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : (p.updatedAt as Date)?.toISOString?.() ?? "",
      })));
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      toast("Slug and title are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/custom-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: form.slug.trim(), title: form.title.trim(), content: form.content }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to create page", "error");
        return;
      }
      toast("Page created. Add content below or on next edit.", "success");
      setForm({ slug: "", title: "", content: "" });
      setFormContent("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, slug: string, title: string, content: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/custom-pages/id/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), title: title.trim(), content }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to update", "error");
        return;
      }
      toast("Page saved.", "success");
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    try {
      const res = await fetch(`/api/custom-pages/id/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Page deleted.", "success");
        if (editingId === id) setEditingId(null);
        load();
      } else toast("Failed to delete.", "error");
    } catch {
      toast("Failed to delete.", "error");
    }
  };

  const togglePublished = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setTogglingId(id);
    try {
      const res = await fetch(`/api/custom-pages/id/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !page.published }),
      });
      if (res.ok) {
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, published: !p.published } : p)));
        toast(page.published ? "Set to Draft (hidden from site)." : "Set to Public (visible on site).", "success");
      } else toast("Failed to update.", "error");
    } catch {
      toast("Failed to update.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const startEdit = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setEditingId(id);
    setForm({ slug: page.slug, title: page.title, content: "" });
    try {
      const res = await fetch(`/api/custom-pages/slug/${page.slug}`);
      if (res.ok) {
        const data = await res.json();
        setFormContent(data.content || "");
      }
    } catch {
      setFormContent("");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(pages, oldIndex, newIndex);
    setPages(reordered);
    setSaving(true);
    try {
      const res = await fetch("/api/custom-pages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to reorder", "error");
        load();
      } else {
        toast("Order saved.", "success");
      }
    } catch {
      toast("Failed to reorder.", "error");
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-600">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Custom pages</h2>
        <p className="text-slate-600 mt-1">
          Add pages like Portfolio or Services. Use slug in URL: /page/<strong>slug</strong>. Link them from Site settings → Navigation (e.g. href: /page/portfolio).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add new page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Slug</span>
            <FieldHelp text="URL path: slug 'portfolio' becomes /page/portfolio. Use lowercase letters, numbers, and hyphens only. No spaces." />
          </div>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="e.g. portfolio"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-40"
            />
            <Input
              placeholder="Title (e.g. Portfolio)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="flex-1 min-w-[200px]"
            />
          </div>
          <Textarea
            placeholder="Content (Markdown, optional at first)"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={3}
            className="resize-y"
          />
          <Button onClick={create} disabled={saving}>
            {saving ? "Creating..." : "Create page"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing pages</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Loaded from <strong>/api/custom-pages</strong>. Drag to reorder. When &quot;Auto-add custom pages to navigation&quot; is ON in Site settings, these pages appear at the end of the <strong>public site</strong> top navbar—open the public site (e.g. &quot;View site&quot;) to see them. You can also add links manually in Site settings → Navigation.
          </p>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <p className="text-slate-500">No custom pages yet. Create one above.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-3">
                  {pages.map((p) => (
                    <SortablePageItem key={p.id} page={p} onEdit={startEdit} onRemove={remove} onTogglePublished={togglePublished} togglingId={togglingId} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {editingId && (() => {
        const p = pages.find((x) => x.id === editingId);
        if (!p) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit: {p.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-40"
                />
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm text-slate-600">Content (Markdown):</span>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setInsertMediaFor("image")} title="Insert image from Media">
                  <ImageIcon className="h-4 w-4" />
                  Insert image
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setInsertMediaFor("button")} title="Insert link button from Media (or use any URL)">
                  <Link2 className="h-4 w-4" />
                  Insert button
                </Button>
              </div>
              <Textarea
                placeholder="Content (Markdown)"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={12}
                className="resize-y font-mono text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => update(editingId, form.slug, form.title, formContent)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const slug = (form.slug || "").trim().replace(/^\/+|\/+$/g, "") || "page";
                    window.open(`${base}/page/${slug}`, "_blank", "noopener");
                  }}
                  disabled={!form.slug?.trim()}
                  className="gap-1"
                  title="Open this page on the public site in a new tab. Save first if you changed the slug."
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
                <Button variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <InsertMediaModal
        open={insertMediaFor !== null}
        onClose={() => setInsertMediaFor(null)}
        onSelect={(url, name) => {
          if (insertMediaFor === "image") {
            setFormContent((prev) => prev + `\n![${name}](${url})\n`);
          } else if (insertMediaFor === "button") {
            setFormContent((prev) => prev + `\n[Button](${url})\n`);
          }
          setInsertMediaFor(null);
        }}
      />
    </div>
  );
}
