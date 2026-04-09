"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { stableStringify } from "@/lib/stable-stringify";
import type { VisualBlock } from "@/types/saas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VersionRecord = {
  id: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function wysiwygStorageKey(siteId: string, pageId: string) {
  return `saas-wysiwyg-draft:${siteId}:${pageId}`;
}

const defaultBlockStyles = BLOCK_LIBRARY[0]!.defaultStyles;

type SlashItem = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  build: () => VisualBlock;
};

function buildSlashItems(): SlashItem[] {
  return [
    {
      id: "heading",
      label: "Heading",
      hint: "Hero-style title and subtitle",
      keywords: "heading title h1 hero",
      build: () => {
        const def = BLOCK_LIBRARY.find((x) => x.type === "MarketingHeroSimple")!;
        return {
          id: `block-${makeId()}`,
          type: def.type,
          content: { ...def.defaultContent },
          styles: { ...def.defaultStyles },
        };
      },
    },
    {
      id: "code",
      label: "Code block",
      hint: "Syntax-highlighted snippet",
      keywords: "code snippet typescript",
      build: () => ({
        id: `block-${makeId()}`,
        type: "CodeSnippet",
        content: {
          title: "Snippet",
          codeText: '// Your code\nconsole.log("hello");',
          codeLanguage: "typescript",
          codeFilename: "example.ts",
        },
        styles: { ...defaultBlockStyles },
      }),
    },
    {
      id: "image",
      label: "Image",
      hint: "Responsive figure block",
      keywords: "image photo media",
      build: () => {
        const def = BLOCK_LIBRARY.find((x) => x.type === "MediaImage")!;
        return {
          id: `block-${makeId()}`,
          type: def.type,
          content: { ...def.defaultContent },
          styles: { ...def.defaultStyles },
        };
      },
    },
    {
      id: "quote",
      label: "Quote",
      hint: "Pull quote card",
      keywords: "quote citation testimonial",
      build: () => {
        const def = BLOCK_LIBRARY.find((x) => x.type === "LayoutCard")!;
        return {
          id: `block-${makeId()}`,
          type: def.type,
          content: {
            title: '"Your quote here"',
            subtitle: "— Attribution",
          },
          styles: { ...def.defaultStyles },
        };
      },
    },
  ];
}

const SLASH_ITEMS = buildSlashItems();

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
      className={`rounded-lg border p-2 transition-shadow ${
        selected
          ? "border-slate-400 bg-white shadow-sm ring-2 ring-slate-200"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="flex-1 text-left text-sm font-medium text-slate-800" onClick={onSelect}>
          {block.type}
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Drag
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          onClick={onDelete}
        >
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
  const [pageReady, setPageReady] = useState(false);
  const [localDraftBanner, setLocalDraftBanner] = useState<"hidden" | "offer">("hidden");
  const [slashLine, setSlashLine] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);

  const slashInputRef = useRef<HTMLInputElement>(null);
  const pendingLocalDraftRef = useRef<VisualBlock[] | null>(null);
  const lastAutosaveRef = useRef<string>("");
  const serverBaselineRef = useRef<string>("");

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId]
  );

  const serializeBlocks = useCallback((list: VisualBlock[]) => stableStringify(list), []);

  const filteredSlash = useMemo(() => {
    const q = slashLine.startsWith("/") ? slashLine.slice(1).trim().toLowerCase() : "";
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.id.includes(q)
    );
  }, [slashLine]);

  const clampedSlashIndex = Math.min(slashIndex, Math.max(0, filteredSlash.length - 1));

  const insertSlashBlock = useCallback((item: SlashItem) => {
    const next = item.build();
    setBlocks((prev) => [...prev, next]);
    setSelectedId(next.id);
    setSlashLine("");
    setSlashOpen(false);
    setSlashMenuPos(null);
    setStatusText(`Inserted ${item.label}.`);
  }, []);

  const updateSlashMenuPosition = useCallback(() => {
    const el = slashInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSlashMenuPos({ top: r.bottom + 6, left: r.left });
  }, []);

  useEffect(() => {
    if (!slashOpen) return;
    updateSlashMenuPosition();
    const onScroll = () => updateSlashMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [slashOpen, slashLine, updateSlashMenuPosition]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPageReady(false);
      setLocalDraftBanner("hidden");
      pendingLocalDraftRef.current = null;
      lastAutosaveRef.current = "";
      serverBaselineRef.current = "";
      setBlocks([]);
      setSelectedId("");
      setSlashLine("");
      setSlashOpen(false);

      const [pageRes, versionsRes] = await Promise.all([
        fetch(`/api/saas/sites/${siteId}/pages/${pageId}`),
        fetch(`/api/saas/sites/${siteId}/pages/${pageId}/versions`),
      ]);
      if (cancelled) return;

      if (versionsRes.ok) {
        const data = (await versionsRes.json()) as VersionRecord[];
        setVersions(Array.isArray(data) ? data : []);
      }

      if (!pageRes.ok) {
        setPageReady(true);
        return;
      }

      const data = await pageRes.json();
      const draft = Array.isArray(data.draftBlocks) ? data.draftBlocks : [];
      const hydrated = draft.map((b: Record<string, unknown>, idx: number) => ({
        id: String(b.id ?? `block-${idx}-${makeId()}`),
        type: String(b.type ?? "LayoutCard"),
        content: (b.content as Record<string, unknown>) ?? {},
        styles: (b.styles as Record<string, unknown>) ?? {},
      }));
      const serverSnap = stableStringify(hydrated);
      serverBaselineRef.current = serverSnap;
      lastAutosaveRef.current = serverSnap;
      setBlocks(hydrated);
      setSelectedId(hydrated[0]?.id || "");

      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(wysiwygStorageKey(siteId, pageId)) : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { blocks?: VisualBlock[] };
          if (Array.isArray(parsed.blocks)) {
            const localSnap = stableStringify(parsed.blocks);
            if (localSnap !== serverSnap) {
              pendingLocalDraftRef.current = parsed.blocks;
              setLocalDraftBanner("offer");
            }
          }
        }
      } catch {
        /* ignore invalid draft */
      }

      setPageReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, pageId]);

  useEffect(() => {
    if (!pageReady) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          wysiwygStorageKey(siteId, pageId),
          JSON.stringify({ v: 1, savedAt: Date.now(), blocks })
        );
      } catch {
        /* quota or private mode */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [blocks, siteId, pageId, pageReady]);

  useEffect(() => {
    if (!pageReady) return;
    const snap = serializeBlocks(blocks);
    if (snap === lastAutosaveRef.current) return;
    const timer = window.setTimeout(async () => {
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
      if (res.ok) {
        lastAutosaveRef.current = serializeBlocks(blocks);
        setStatusText((prev) => (prev.startsWith("Auto-saved") ? prev : "Auto-saved draft."));
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [blocks, pageReady, serializeBlocks, siteId, pageId]);

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
    if (res.ok) {
      lastAutosaveRef.current = serializeBlocks(blocks);
      serverBaselineRef.current = lastAutosaveRef.current;
      setStatusText("Draft saved.");
    } else {
      setStatusText("Failed to save draft.");
    }
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
      const next = draft.map((b: Record<string, unknown>, idx: number) => ({
        id: String(b.id ?? `block-${idx}-${makeId()}`),
        type: String(b.type ?? "LayoutCard"),
        content: (b.content as Record<string, unknown>) ?? {},
        styles: (b.styles as Record<string, unknown>) ?? {},
      }));
      setBlocks(next);
      lastAutosaveRef.current = serializeBlocks(next);
      serverBaselineRef.current = lastAutosaveRef.current;
    }
  };

  const restoreLocalDraft = () => {
    const pending = pendingLocalDraftRef.current;
    if (!pending) return;
    setBlocks(pending);
    setSelectedId(pending[0]?.id || "");
    setLocalDraftBanner("hidden");
    pendingLocalDraftRef.current = null;
    setStatusText("Restored local draft.");
  };

  const dismissLocalDraft = () => {
    try {
      localStorage.removeItem(wysiwygStorageKey(siteId, pageId));
    } catch {
      /* ignore */
    }
    pendingLocalDraftRef.current = null;
    setLocalDraftBanner("hidden");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
      <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Block Library (50+)</h3>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search block"
          className="mb-3 border-slate-200"
        />
        <div className="max-h-[65vh] space-y-2 overflow-auto">
          {filteredLibrary.map((item) => (
            <button
              key={item.type}
              type="button"
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-left text-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              onClick={() => addBlock(item.type)}
            >
              <div className="font-medium text-slate-800">{item.label}</div>
              <div className="text-xs text-slate-500">{item.category}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Canvas (WYSIWYG Preview)</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void saveDraft()}>
              Save Draft
            </Button>
            <Button onClick={() => void publish()}>Publish</Button>
          </div>
        </div>

        {localDraftBanner === "offer" ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>A local draft differs from the last saved server version.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreLocalDraft}>
                Restore local draft
              </Button>
              <Button size="sm" onClick={dismissLocalDraft}>
                Keep server version
              </Button>
            </div>
          </div>
        ) : null}

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

        <div className="relative mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Slash insert</label>
          <Input
            ref={slashInputRef}
            value={slashLine}
            onChange={(e) => {
              const v = e.target.value;
              setSlashLine(v);
              if (v.startsWith("/")) {
                setSlashOpen(true);
                setSlashIndex(0);
                requestAnimationFrame(() => updateSlashMenuPosition());
              } else {
                setSlashOpen(false);
                setSlashMenuPos(null);
              }
            }}
            onKeyDown={(e) => {
              if (!slashOpen || filteredSlash.length === 0) {
                if (e.key === "Escape") {
                  setSlashOpen(false);
                  setSlashLine("");
                }
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashIndex((i) => Math.min(i + 1, filteredSlash.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = filteredSlash[clampedSlashIndex];
                if (item) insertSlashBlock(item);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setSlashOpen(false);
                setSlashLine("");
                setSlashMenuPos(null);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setSlashOpen(false);
                setSlashMenuPos(null);
              }, 180);
            }}
            placeholder="Type / for Heading, Code block, Image, Quote…"
            className="border-slate-200 bg-white"
          />
          {slashOpen && slashMenuPos && filteredSlash.length > 0 ? (
            <ul
              className="fixed z-50 max-h-60 min-w-[220px] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
              role="listbox"
            >
              {filteredSlash.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === clampedSlashIndex}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                      idx === clampedSlashIndex ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertSlashBlock(item);
                    }}
                  >
                    <span className="font-medium text-slate-900">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <BlockRenderer blocks={blocks} />
        </div>
        {statusText ? <p className="mt-3 text-sm text-slate-600">{statusText}</p> : null}
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Visual CSS Editor</h3>
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
              className="border-slate-200"
            />
            <Input
              value={String(selectedBlock.content.subtitle ?? "")}
              onChange={(e) =>
                updateSelected((b) => ({ ...b, content: { ...b.content, subtitle: e.target.value } }))
              }
              placeholder="Subtitle"
              className="border-slate-200"
            />
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => void rewriteSelectedCopy("seo")}>
                Magic SEO
              </Button>
              <Button size="sm" variant="outline" onClick={() => void rewriteSelectedCopy("formal")}>
                Magic Formal
              </Button>
              <Button size="sm" variant="outline" onClick={() => void rewriteSelectedCopy("friendly")}>
                Magic Friendly
              </Button>
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
                  className="border-slate-200"
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
                className="border-slate-200"
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
                className="border-slate-200"
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
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Revision History</h4>
          <div className="max-h-56 space-y-2 overflow-auto">
            {versions.map((v) => (
              <button
                type="button"
                key={v.id}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-left text-xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                onClick={() => void restoreVersion(v.id)}
              >
                <div className="font-medium text-slate-800">
                  Version {v.versionNumber} ({v.status})
                </div>
                <div className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
