"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image as ImageIcon, Save, Send, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { SiteBlockBuilder } from "@/components/site-block-builder";
import type { EditorTarget } from "@/lib/editor-route";

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

type ContactContent = {
  intro?: string;
  formNote?: string;
};

type AboutContent = {
  heroName?: string | null;
  heroTagline?: string | null;
  introText?: string | null;
  profileImage?: string | null;
};

type CustomPageContent = {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
};

const HOME_SECTION_IDS = ["hero", "latestPosts", "skills"] as const;
const HOME_SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  latestPosts: "Latest Articles",
  skills: "Technical Skills",
};

const defaultHome: HomeContent = {
  heroTitle: "Hi, I'm [Your Name].",
  heroSubtitle: "Your tagline or role — e.g. Developer | Designer",
  skills: ["Skill one", "Skill two", "Skill three"],
  ctaPrimaryText: "Read My Blog",
  ctaPrimaryHref: "/blog",
  ctaSecondaryText: "View Projects",
  ctaSecondaryHref: "/about",
  ctaContactText: "Get in Touch",
  ctaContactHref: "/contact",
  sectionOrder: [...HOME_SECTION_IDS],
  sectionVisibility: {},
};

const defaultContact: ContactContent = {
  intro: "I'm open to new opportunities, collaborations, or a chat about tech.",
  formNote: "Use the form below, or email me directly.",
};

function SortableSection({
  id,
  children,
  isEditing,
}: {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isEditing ? `group relative ${isDragging ? "z-20" : ""}` : ""}
    >
      {isEditing && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-[var(--ring)]/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        />
      )}
      {isEditing && (
        <motion.div
          className="absolute left-2 top-2 z-10"
          initial={false}
          animate={{
            scale: isDragging ? 1.05 : 1,
            boxShadow: isDragging
              ? "0 10px 15px -3px oklch(0.2 0.02 265 / 0.12), 0 4px 6px -4px oklch(0.2 0.02 265 / 0.08)"
              : "0 1px 2px oklch(0.2 0.02 265 / 0.05)",
          }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--muted-foreground)] shadow-[var(--shadow-sm)] backdrop-blur-md transition-colors hover:bg-[oklch(1_0_0/0.9)] hover:text-[var(--foreground)] active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Drag section: ${HOME_SECTION_LABELS[id] ?? id}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </motion.div>
      )}
      <motion.div
        layout
        initial={false}
        animate={{
          scale: isDragging ? 1.02 : 1,
          opacity: isDragging ? 0.92 : 1,
          boxShadow: isDragging
            ? "0 10px 15px -3px oklch(0.2 0.02 265 / 0.08), 0 4px 6px -4px oklch(0.2 0.02 265 / 0.05)"
            : "0 0 0 transparent",
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

function EditableText({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  className: string;
  placeholder: string;
}) {
  return (
    <div
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      className={`${className} rounded-lg outline-none transition-shadow duration-150 focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-background`}
      data-placeholder={placeholder}
      onBlur={(event) => onChange(event.currentTarget.textContent?.trim() || "")}
    >
      {value}
    </div>
  );
}

export function ImmersiveEditor({ target }: { target: EditorTarget }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  const [home, setHome] = useState<HomeContent>(defaultHome);
  const [contact, setContact] = useState<ContactContent>(defaultContact);
  const [about, setAbout] = useState<AboutContent>({});
  const [customPage, setCustomPage] = useState<CustomPageContent | null>(null);
  const [customEditorMode, setCustomEditorMode] = useState<"builder" | "raw">("builder");

  const [isEditing] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        if (target.kind === "home") {
          const res = await fetch("/api/site-content?page=home", { cache: "no-store" });
          const data = (await res.json()) as HomeContent | null;
          if (!cancelled) setHome({ ...defaultHome, ...(data ?? {}) });
        } else if (target.kind === "contact") {
          const res = await fetch("/api/site-content?page=contact", { cache: "no-store" });
          const data = (await res.json()) as ContactContent | null;
          if (!cancelled) setContact({ ...defaultContact, ...(data ?? {}) });
        } else if (target.kind === "about") {
          const res = await fetch("/api/about/config", { cache: "no-store" });
          const data = (await res.json()) as AboutContent;
          if (!cancelled) setAbout(data ?? {});
        } else if (target.kind === "custom-page") {
          const listRes = await fetch("/api/custom-pages", { cache: "no-store" });
          const list = (await listRes.json()) as Array<{ id: string; slug: string; title: string; published: boolean }>;
          const row = list.find((item) => item.slug === target.slug);
          if (!row) {
            if (!cancelled) setCustomPage(null);
          } else {
            const res = await fetch(`/api/custom-pages/slug/${target.slug}`, { cache: "no-store" });
            const data = (await res.json()) as { content: string };
            if (!cancelled) {
              setCustomPage({
                id: row.id,
                slug: row.slug,
                title: row.title,
                content: data.content ?? "",
                published: row.published,
              });
            }
          }
        }
      } catch {
        if (!cancelled) setMessage("Failed to load editor data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [target]);

  const sectionOrder = useMemo(() => {
    const raw = home.sectionOrder ?? HOME_SECTION_IDS;
    return raw.filter((id) => HOME_SECTION_IDS.includes(id as (typeof HOME_SECTION_IDS)[number]));
  }, [home.sectionOrder]);

  async function saveAndPublish() {
    setSaving(true);
    setMessage("");
    try {
      if (target.kind === "home") {
        const payload = { ...home, sectionOrder, sectionVisibility: home.sectionVisibility ?? {} };
        const res = await fetch("/api/site-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: "home", content: payload }),
        });
        if (!res.ok) throw new Error("save failed");
      } else if (target.kind === "contact") {
        const res = await fetch("/api/site-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: "contact", content: contact }),
        });
        if (!res.ok) throw new Error("save failed");
      } else if (target.kind === "about") {
        const res = await fetch("/api/about/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(about),
        });
        if (!res.ok) throw new Error("save failed");
      } else if (target.kind === "custom-page" && customPage) {
        const res = await fetch(`/api/custom-pages/id/${customPage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: customPage.slug,
            title: customPage.title,
            content: customPage.content,
            published: customPage.published,
          }),
        });
        if (!res.ok) throw new Error("save failed");
      }
      setMessage(target.kind === "custom-page" ? "Saved custom page." : "Saved to live site.");
      setSavedAt(Date.now());
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => {
        setSavedAt(null);
        savedTimeoutRef.current = null;
      }, 2000);
    } catch {
      setMessage("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  async function handleCvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setMessage("Please upload a PDF file.");
      event.target.value = "";
      return;
    }
    setCvUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "CV upload failed");
      }
      setMessage("CV uploaded. Download CV now uses the new file.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CV upload failed");
    } finally {
      setCvUploading(false);
      event.target.value = "";
    }
  }

  function onDragEnd(event: DragEndEvent) {
    if (target.kind !== "home") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionOrder.indexOf(String(active.id));
    const newIndex = sectionOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setHome((current) => ({ ...current, sectionOrder: arrayMove(sectionOrder, oldIndex, newIndex) }));
  }

  if (loading) {
    return <div className="container mx-auto max-w-6xl px-6 py-10 text-[var(--muted-foreground)]">Loading editor...</div>;
  }

  const pagePath =
    target.kind === "home"
      ? "/"
      : target.kind === "about"
        ? "/about"
        : target.kind === "contact"
          ? "/contact"
          : `/page/${target.slug}`;
  return (
    <div className={`relative min-h-screen pb-36 pt-6 bg-[var(--background)] ${isEditing ? "editor-grid-overlay" : ""}`}>
      <div className="container mx-auto max-w-6xl px-6 py-10">
        {target.kind === "home" && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-8">
                {sectionOrder.includes("hero") && (
                  <SortableSection id="hero" isEditing={isEditing}>
                    <section className="container mx-auto max-w-6xl px-6 py-20 md:py-28 lg:py-32">
                      <div className="mx-auto max-w-4xl text-center">
                        <EditableText
                          value={home.heroTitle ?? defaultHome.heroTitle ?? ""}
                          onChange={(value) => setHome((current) => ({ ...current, heroTitle: value }))}
                          className="mb-6 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl lg:text-7xl"
                          placeholder="Hero title"
                        />
                        <EditableText
                          value={home.heroSubtitle ?? defaultHome.heroSubtitle ?? ""}
                          onChange={(value) => setHome((current) => ({ ...current, heroSubtitle: value }))}
                          className="mb-10 text-lg text-[var(--muted-foreground)] sm:text-xl md:text-2xl"
                          placeholder="Hero subtitle"
                        />
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                          <Button size="lg">{home.ctaPrimaryText || "Read My Blog"}</Button>
                          <Button size="lg" variant="outline">{home.ctaSecondaryText || "View Projects"}</Button>
                          <Button size="lg" variant="outline">{home.ctaContactText || "Get in Touch"}</Button>
                        </div>
                      </div>
                    </section>
                  </SortableSection>
                )}
                {sectionOrder.includes("latestPosts") && (
                  <SortableSection id="latestPosts" isEditing={isEditing}>
                    <section className="container mx-auto max-w-6xl px-6 py-16">
                      <h2 className="mb-8 text-3xl font-bold text-[var(--foreground)]">Latest Articles</h2>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-12 text-center text-[var(--muted-foreground)]">
                        Live post cards render on the public page. This block is reorderable in editor mode.
                      </div>
                    </section>
                  </SortableSection>
                )}
                {sectionOrder.includes("skills") && (
                  <SortableSection id="skills" isEditing={isEditing}>
                    <section className="container mx-auto max-w-6xl px-6 py-16">
                      <div className="mx-auto max-w-4xl">
                        <h2 className="mb-8 text-center text-3xl font-bold text-[var(--foreground)]">Technical Skills</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                          {(home.skills ?? defaultHome.skills ?? []).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-4 py-2 text-sm font-medium text-[var(--foreground)]">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </section>
                  </SortableSection>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {target.kind === "contact" && (
          <section className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
            <EditableText
              value={contact.intro ?? defaultContact.intro ?? ""}
              onChange={(value) => setContact((current) => ({ ...current, intro: value }))}
              className="mb-4 text-lg text-[var(--muted-foreground)]"
              placeholder="Contact intro text"
            />
            <EditableText
              value={contact.formNote ?? defaultContact.formNote ?? ""}
              onChange={(value) => setContact((current) => ({ ...current, formNote: value }))}
              className="mb-10 text-sm text-[var(--muted-foreground)]"
              placeholder="Contact form note"
            />
            <Card className="shadow-lg">
              <CardContent className="pt-6 text-[var(--foreground)]">
                Contact form block (live behavior remains on public route).
              </CardContent>
            </Card>
          </section>
        )}

        {target.kind === "about" && (
          <section className="container mx-auto max-w-5xl px-6 py-12">
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMediaOpen(true)}
                    className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--ring)]"
                  >
                    {about.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL from editor
                    <img src={about.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10" />
                  )}
                  </button>
                  <EditableText
                    value={about.heroName?.trim() || "Your name"}
                    onChange={(value) => setAbout((current) => ({ ...current, heroName: value }))}
                    className="mb-2 text-4xl font-bold text-[var(--foreground)]"
                    placeholder="Hero name"
                  />
                  <EditableText
                    value={about.heroTagline?.trim() || "Your tagline"}
                    onChange={(value) => setAbout((current) => ({ ...current, heroTagline: value }))}
                    className="mb-4 text-lg text-[var(--muted-foreground)]"
                    placeholder="Hero tagline"
                  />
                  <EditableText
                    value={about.introText?.trim() || "Write an intro..."}
                    onChange={(value) => setAbout((current) => ({ ...current, introText: value }))}
                    className="mx-auto max-w-3xl text-left text-[var(--foreground)]"
                    placeholder="Intro text"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {target.kind === "custom-page" && (
          <section className="container mx-auto max-w-4xl px-4 py-12">
            {!customPage ? (
              <Card>
                <CardContent className="pt-6 text-[var(--muted-foreground)]">
                  Page not found. Create it in <Link href="/dashboard/content/pages" className="underline">Custom pages</Link> or open another slug.
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg">
                <CardContent className="space-y-4 pt-6">
                  <EditableText
                    value={customPage.title}
                    onChange={(value) => setCustomPage((current) => (current ? { ...current, title: value } : current))}
                    className="text-3xl font-bold text-[var(--foreground)]"
                    placeholder="Page title"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={customEditorMode === "builder" ? "default" : "outline"}
                      onClick={() => setCustomEditorMode("builder")}
                    >
                      Visual builder
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={customEditorMode === "raw" ? "default" : "outline"}
                      onClick={() => setCustomEditorMode("raw")}
                    >
                      Raw markdown
                    </Button>
                  </div>
                  {customEditorMode === "builder" ? (
                    <SiteBlockBuilder
                      value={customPage.content}
                      onChange={(nextMarkdown) =>
                        setCustomPage((current) =>
                          current ? { ...current, content: nextMarkdown } : current
                        )
                      }
                    />
                  ) : (
                  <div
                    role="textbox"
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-64 rounded-md border border-[var(--border)] p-4 font-mono text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-300"
                    onBlur={(event) =>
                      setCustomPage((current) => (current ? { ...current, content: event.currentTarget.textContent ?? "" } : current))
                    }
                  >
                    {customPage.content}
                  </div>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={customPage.published}
                      onChange={(event) =>
                        setCustomPage((current) =>
                          current ? { ...current, published: event.target.checked } : current
                        )
                      }
                    />
                    Published
                  </label>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 shadow-[var(--glass-shadow-hover)] backdrop-blur-xl">
        <span className="rounded-full bg-[var(--muted)]/80 px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
          Editor Mode
        </span>
        {saving && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--muted)]/80 px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]" aria-live="polite">
            <Save className="h-3.5 w-3.5 animate-pulse" aria-hidden />
            Saving...
          </span>
        )}
        {!saving && savedAt !== null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Saved
          </motion.span>
        )}
        <div className="flex items-center gap-2">
          {target.kind === "about" && (
            <>
              <input
                ref={cvInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => void handleCvUpload(event)}
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={cvUploading}
                onClick={() => cvInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {cvUploading ? "Uploading CV..." : "Upload CV"}
              </Button>
            </>
          )}
          <Button onClick={() => void saveAndPublish()} disabled={saving} size="sm" className="gap-1.5" data-testid="floating-save-publish">
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <a href={pagePath}>
            <Button variant="outline" size="sm">Exit</Button>
          </a>
        </div>
        {message && <p className="mt-2 text-xs text-[var(--muted-foreground)]" role="status">{message}</p>}
      </div>

      <InsertMediaModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          setAbout((current) => ({ ...current, profileImage: url }));
          setMediaOpen(false);
        }}
      />
    </div>
  );
}
