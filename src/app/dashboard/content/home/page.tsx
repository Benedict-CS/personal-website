"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { GripVertical } from "lucide-react";
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

const HOME_SECTION_IDS = ["hero", "latestPosts", "skills"] as const;
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero (title + buttons)",
  latestPosts: "Latest Articles",
  skills: "Technical Skills",
};

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  skills?: string[];
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  ctaContactText?: string;
  ctaContactHref?: string;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
};

const defaults: HomeContent = {
  heroTitle: "Hi, I'm Benedict.",
  heroSubtitle: "Network Administrator | Full Stack Developer | Open Source Enthusiast",
  skills: ["Next.js", "TypeScript", "Proxmox", "Linux", "Networking", "Docker"],
  ctaPrimaryText: "Read My Blog",
  ctaPrimaryHref: "/blog",
  ctaSecondaryText: "View Projects",
  ctaSecondaryHref: "/about",
  ctaContactText: "Get in Touch",
  ctaContactHref: "/contact",
  sectionOrder: [...HOME_SECTION_IDS],
  sectionVisibility: {},
};

function SortableSectionRow({
  id,
  label,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2 ${isDragging ? "z-20 opacity-95 shadow-md rounded bg-white border" : ""}`}
    >
      <button type="button" className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-600" {...attributes} {...listeners} aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <input type="checkbox" checked={visible} onChange={(e) => onToggle(e.target.checked)} className="rounded border-slate-300" />
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </label>
    </div>
  );
}

function HomeSectionsCard({
  sectionOrder,
  sectionVisibility,
  onOrderChange,
  onVisibilityChange,
}: {
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  onOrderChange: (order: string[]) => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) onOrderChange(arrayMove(sectionOrder, oldIndex, newIndex));
    }
  };
  const visible = (id: string) => sectionVisibility[id] !== false;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Home page sections</CardTitle>
        <p className="text-sm text-slate-600">Choose which sections to show and in what order. Drag to reorder.</p>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-0">
              {sectionOrder.map((id) => (
                <SortableSectionRow
                  key={id}
                  id={id}
                  label={SECTION_LABELS[id] ?? id}
                  visible={visible(id)}
                  onToggle={(v) => onVisibilityChange(id, v)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

export default function EditHomePage() {
  const [content, setContent] = useState<HomeContent>(defaults);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/site-content?page=home")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setContent({ ...defaults, ...data });
          setSkillsText(Array.isArray(data.skills) ? data.skills.join("\n") : (data.skills as string) ?? defaults.skills!.join("\n"));
        } else {
          setContent(defaults);
          setSkillsText(defaults.skills!.join("\n"));
        }
      })
      .catch(() => {
        setContent(defaults);
        setSkillsText(defaults.skills!.join("\n"));
      })
      .finally(() => setLoading(false));
  }, []);

  const sectionOrder = Array.isArray(content.sectionOrder) && content.sectionOrder.length > 0
    ? content.sectionOrder.filter((id) => HOME_SECTION_IDS.includes(id as (typeof HOME_SECTION_IDS)[number]))
    : [...HOME_SECTION_IDS];
  const sectionVisibility = content.sectionVisibility ?? {};

  const setSectionOrder = (order: string[]) => setContent((c) => ({ ...c, sectionOrder: order }));
  const setSectionVisible = (id: string, visible: boolean) =>
    setContent((c) => ({ ...c, sectionVisibility: { ...(c.sectionVisibility ?? {}), [id]: visible } }));

  const save = async () => {
    const skills = skillsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      ...content,
      skills,
      sectionOrder: sectionOrder.length > 0 ? sectionOrder : [...HOME_SECTION_IDS],
      sectionVisibility: sectionVisibility,
    };
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "home", content: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/content" className="text-slate-600 hover:text-slate-900">
          ← Content
        </Link>
        <h2 className="text-3xl font-bold text-slate-900">Edit Home Page</h2>
      </div>

      {message && (
        <p className={message.type === "success" ? "text-green-700" : "text-red-700"}>
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={content.heroTitle ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, heroTitle: e.target.value }))}
              placeholder={defaults.heroTitle}
            />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input
              value={content.heroSubtitle ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, heroSubtitle: e.target.value }))}
              placeholder={defaults.heroSubtitle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA Buttons</CardTitle>
          <p className="text-sm text-slate-600">Primary, secondary, and contact button.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Primary (e.g. Read My Blog)</Label>
              <Input
                value={content.ctaPrimaryText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaPrimaryText: e.target.value }))}
                placeholder="Read My Blog"
              />
              <Input
                className="mt-2"
                value={content.ctaPrimaryHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaPrimaryHref: e.target.value }))}
                placeholder="/blog"
              />
            </div>
            <div>
              <Label>Secondary (e.g. View Projects)</Label>
              <Input
                value={content.ctaSecondaryText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaSecondaryText: e.target.value }))}
                placeholder="View Projects"
              />
              <Input
                className="mt-2"
                value={content.ctaSecondaryHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaSecondaryHref: e.target.value }))}
                placeholder="/about"
              />
            </div>
            <div>
              <Label>Contact button</Label>
              <Input
                value={content.ctaContactText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaContactText: e.target.value }))}
                placeholder="Get in Touch"
              />
              <Input
                className="mt-2"
                value={content.ctaContactHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaContactHref: e.target.value }))}
                placeholder="/contact"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical Skills</CardTitle>
          <p className="text-sm text-slate-600">One per line or comma-separated.</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            rows={6}
            placeholder="Next.js&#10;TypeScript&#10;..."
            className="resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      <HomeSectionsCard
        sectionOrder={sectionOrder}
        sectionVisibility={sectionVisibility}
        onOrderChange={setSectionOrder}
        onVisibilityChange={setSectionVisible}
      />

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Home Page"}
      </Button>
    </div>
  );
}
