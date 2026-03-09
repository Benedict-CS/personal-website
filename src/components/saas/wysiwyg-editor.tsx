"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockRenderer } from "@/components/saas/block-renderer";
import { BLOCK_LIBRARY } from "@/lib/saas/block-library";
import type { VisualBlock } from "@/types/saas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VersionRecord = { id: string; versionNumber: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; createdAt: string };

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function SortableBlock({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: VisualBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded border p-2 ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="font-medium text-left flex-1" onClick={onSelect}>
          {block.type}
        </button>
        <button type="button" {...attributes} {...listeners} className="rounded border px-2 py-1 text-xs">
          Drag
        </button>
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={onDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}

export function WysiwygEditor({ siteId, pageId }: { siteId: string; pageId: string }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [blocks, setBlocks] = useState<VisualBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [versions, setVersions] = useState<VersionRecord[]>([]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId]
  );

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}`);
      if (!res.ok) return;
      const data = await res.json();
      const draft = Array.isArray(data.draftBlocks) ? data.draftBlocks : [];
      const hydrated = draft.map((b: Record<string, unknown>, idx: number) => ({
        id: String(b.id ?? `block-${idx}-${makeId()}`),
        type: String(b.type ?? "LayoutCard"),
        content: (b.content as Record<string, unknown>) ?? {},
        styles: (b.styles as Record<string, unknown>) ?? {},
      }));
      setBlocks(hydrated);
      setSelectedId(hydrated[0]?.id || "");
    };
    const loadVersions = async () => {
      const res = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}/versions`);
      if (!res.ok) return;
      const data = (await res.json()) as VersionRecord[];
      setVersions(Array.isArray(data) ? data : []);
    };
    load();
    loadVersions();
  }, [siteId, pageId]);

  const filteredLibrary = BLOCK_LIBRARY.filter((b) =>
    `${b.label} ${b.type} ${b.category}`.toLowerCase().includes(query.toLowerCase())
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const addBlock = (type: string) => {
    const def = BLOCK_LIBRARY.find((x) => x.type === type);
    if (!def) return;
    const next: VisualBlock = {
      id: `block-${makeId()}`,
      type: def.type,
      content: { ...def.defaultContent },
      styles: { ...def.defaultStyles },
    };
    setBlocks((prev) => [...prev, next]);
    setSelectedId(next.id);
  };

  const updateSelected = (updater: (block: VisualBlock) => VisualBlock) => {
    if (!selectedId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedId ? updater(b) : b)));
  };

  const saveDraft = async () => {
    const payload = blocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      styles: b.styles,
    }));
    const res = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftBlocks: payload }),
    });
    setStatusText(res.ok ? "Draft saved." : "Failed to save draft.");
  };

  const publish = async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}/publish`, { method: "POST" });
    if (res.ok) {
      setStatusText("Published.");
      const versionsRes = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}/versions`);
      if (versionsRes.ok) setVersions(await versionsRes.json());
    } else {
      setStatusText("Failed to publish.");
    }
  };

  const rewriteSelectedCopy = async (tone: "seo" | "formal" | "friendly") => {
    if (!selectedBlock) return;
    const currentText = String(selectedBlock.content.subtitle ?? selectedBlock.content.title ?? "");
    if (!currentText.trim()) return;
    const res = await fetch(`/api/saas/sites/${siteId}/ai/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: currentText, tone }),
    });
    if (!res.ok) {
      setStatusText("AI rewrite failed.");
      return;
    }
    const data = (await res.json()) as { rewritten?: string };
    if (!data.rewritten) {
      setStatusText("AI rewrite failed.");
      return;
    }
    updateSelected((b) => ({
      ...b,
      content: {
        ...b.content,
        subtitle: data.rewritten,
      },
    }));
    setStatusText(`AI rewrite applied (${tone}).`);
  };

  const restoreVersion = async (versionId: string) => {
    const res = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}/versions/${versionId}/restore`, {
      method: "POST",
    });
    if (!res.ok) {
      setStatusText("Failed to restore version.");
      return;
    }
    setStatusText("Version restored.");
    const pageRes = await fetch(`/api/saas/sites/${siteId}/pages/${pageId}`);
    if (pageRes.ok) {
      const data = await pageRes.json();
      const draft = Array.isArray(data.draftBlocks) ? data.draftBlocks : [];
      setBlocks(
        draft.map((b: Record<string, unknown>, idx: number) => ({
          id: String(b.id ?? `block-${idx}-${makeId()}`),
          type: String(b.type ?? "LayoutCard"),
          content: (b.content as Record<string, unknown>) ?? {},
          styles: (b.styles as Record<string, unknown>) ?? {},
        }))
      );
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
      <aside className="rounded border border-slate-200 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold">Block Library (50+)</h3>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search block" className="mb-3" />
        <div className="max-h-[65vh] space-y-2 overflow-auto">
          {filteredLibrary.map((item) => (
            <button
              key={item.type}
              type="button"
              className="w-full rounded border border-slate-200 px-2 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => addBlock(item.type)}
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-slate-500">{item.category}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Canvas (WYSIWYG Preview)</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft}>Save Draft</Button>
            <Button onClick={publish}>Publish</Button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={block.id === selectedId}
                  onSelect={() => setSelectedId(block.id)}
                  onDelete={() => setBlocks((prev) => prev.filter((x) => x.id !== block.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-4 rounded border border-slate-200 bg-white p-4">
          <BlockRenderer blocks={blocks} />
        </div>
        {statusText ? <p className="mt-3 text-sm text-slate-600">{statusText}</p> : null}
      </section>

      <aside className="rounded border border-slate-200 bg-white p-3">
        <h3 className="mb-3 text-sm font-semibold">Visual CSS Editor</h3>
        {!selectedBlock ? (
          <p className="text-sm text-slate-500">Select a block on canvas.</p>
        ) : (
          <div className="space-y-3">
            <Input
              value={String(selectedBlock.content.title ?? "")}
              onChange={(e) =>
                updateSelected((b) => ({ ...b, content: { ...b.content, title: e.target.value } }))
              }
              placeholder="Title"
            />
            <Input
              value={String(selectedBlock.content.subtitle ?? "")}
              onChange={(e) =>
                updateSelected((b) => ({ ...b, content: { ...b.content, subtitle: e.target.value } }))
              }
              placeholder="Subtitle"
            />
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => rewriteSelectedCopy("seo")}>Magic SEO</Button>
              <Button size="sm" variant="outline" onClick={() => rewriteSelectedCopy("formal")}>Magic Formal</Button>
              <Button size="sm" variant="outline" onClick={() => rewriteSelectedCopy("friendly")}>Magic Friendly</Button>
            </div>
            {[
              ["paddingTop", "Padding Top"],
              ["paddingBottom", "Padding Bottom"],
              ["marginBottom", "Margin Bottom"],
              ["borderRadius", "Border Radius"],
              ["fontSize", "Font Size"],
              ["fontWeight", "Font Weight"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-slate-600">{label}</label>
                <Input
                  type="number"
                  value={Number(selectedBlock.styles[key] ?? 0)}
                  onChange={(e) =>
                    updateSelected((b) => ({
                      ...b,
                      styles: { ...b.styles, [key]: Number(e.target.value) },
                    }))
                  }
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs text-slate-600">Background</label>
              <Input
                value={String(selectedBlock.styles.backgroundColor ?? "#ffffff")}
                onChange={(e) =>
                  updateSelected((b) => ({
                    ...b,
                    styles: { ...b.styles, backgroundColor: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Text Color</label>
              <Input
                value={String(selectedBlock.styles.color ?? "#0f172a")}
                onChange={(e) =>
                  updateSelected((b) => ({
                    ...b,
                    styles: { ...b.styles, color: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold">Revision History</h4>
          <div className="max-h-56 space-y-2 overflow-auto">
            {versions.map((v) => (
              <button
                type="button"
                key={v.id}
                className="w-full rounded border border-slate-200 px-2 py-2 text-left text-xs hover:bg-slate-50"
                onClick={() => restoreVersion(v.id)}
              >
                <div className="font-medium">Version {v.versionNumber} ({v.status})</div>
                <div className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

