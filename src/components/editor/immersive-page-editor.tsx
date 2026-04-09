"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, Globe, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";

type LatestPost = {
  id: string;
  slug: string;
  title: string;
  content: string;
  description: string | null;
  pinned: boolean;
  createdAt: string;
  tags: { id: string; slug: string; name: string }[];
};

export type HomeContent = {
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

export type ContactContent = { intro?: string; formNote?: string };
export type AboutContent = { profileImage?: string; heroName?: string; heroTagline?: string; introText?: string };
export type CustomContent = { title?: string; content?: string; published?: boolean };

export type EditorPayload =
  | { kind: "home"; slug: string; data: HomeContent; latestPosts: LatestPost[] }
  | { kind: "contact"; slug: string; data: ContactContent }
  | { kind: "about"; slug: string; data: AboutContent }
  | { kind: "custom"; slug: string; pageId: string; data: CustomContent };

const HOME_SECTION_IDS = ["hero", "latestPosts", "skills"] as const;
const DEFAULT_HOME: Required<Omit<HomeContent, "sectionVisibility">> & { sectionVisibility: Record<string, boolean> } = {
  heroTitle: "Hi, I'm Your Name.",
  heroSubtitle: "Builder Owner | Product Creator | Technical Writer",
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

function EditableText({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
}) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className={`${className} rounded px-2 py-1 outline-none ring-offset-2 hover:ring-2 hover:ring-border focus:ring-2 focus:ring-ring`}
      onBlur={(event) => onChange(event.currentTarget.textContent ?? "")}
      data-placeholder={placeholder}
    >
      {value}
    </div>
  );
}

function SortableBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-xl border border-transparent hover:border-border"
      data-editable-block={id}
    >
      <div className="pointer-events-none absolute right-2 top-2 z-20 hidden rounded-md border border-border bg-card/95 p-1 text-muted-foreground shadow-sm group-hover:block">
        <button type="button" className="pointer-events-auto cursor-grab active:cursor-grabbing" aria-label={`Drag ${id}`} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ImmersivePageEditor({ payload, isLoggedIn }: { payload: EditorPayload; isLoggedIn: boolean }) {
  const [home, setHome] = useState<HomeContent>(payload.kind === "home" ? { ...DEFAULT_HOME, ...payload.data } : {});
  const [contact, setContact] = useState<ContactContent>(payload.kind === "contact" ? payload.data : {});
  const [about, setAbout] = useState<AboutContent>(payload.kind === "about" ? payload.data : {});
  const [custom, setCustom] = useState<CustomContent>(payload.kind === "custom" ? payload.data : {});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [mediaOpen, setMediaOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const homeSectionOrder = useMemo(() => {
    const order = Array.isArray(home.sectionOrder) ? home.sectionOrder : DEFAULT_HOME.sectionOrder;
    return order.filter((id): id is (typeof HOME_SECTION_IDS)[number] => HOME_SECTION_IDS.includes(id as (typeof HOME_SECTION_IDS)[number]));
  }, [home.sectionOrder]);
  const homeVisible = (id: string) => (home.sectionVisibility ?? {})[id] !== false;

  const save = async () => {
    if (!isLoggedIn) return;
    setSaving(true);
    setStatus("");
    try {
      if (payload.kind === "home") {
        const response = await fetch("/api/site-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: "home", content: home }),
        });
        if (!response.ok) throw new Error("Failed to save home content");
      } else if (payload.kind === "contact") {
        const response = await fetch("/api/site-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: "contact", content: contact }),
        });
        if (!response.ok) throw new Error("Failed to save contact content");
      } else if (payload.kind === "about") {
        const response = await fetch("/api/about/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(about),
        });
        if (!response.ok) throw new Error("Failed to save about content");
      } else if (payload.kind === "custom") {
        const response = await fetch(`/api/custom-pages/id/${payload.pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(custom),
        });
        if (!response.ok) throw new Error("Failed to save custom page");
      }
      setStatus("Saved and published.");
    } catch {
      setStatus("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const onHomeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = homeSectionOrder.indexOf(active.id as (typeof HOME_SECTION_IDS)[number]);
    const newIndex = homeSectionOrder.indexOf(over.id as (typeof HOME_SECTION_IDS)[number]);
    if (oldIndex === -1 || newIndex === -1) return;
    setHome((prev) => ({ ...prev, sectionOrder: arrayMove(homeSectionOrder, oldIndex, newIndex) }));
  };

  return (
    <div className="relative min-h-screen bg-white">
      {payload.kind === "home" && (
        <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/60">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onHomeDragEnd}>
            <SortableContext items={homeSectionOrder} strategy={verticalListSortingStrategy}>
              {homeSectionOrder.map((id) => {
                if (!homeVisible(id)) return null;
                if (id === "hero") {
                  return (
                    <SortableBlock key={id} id={id}>
                      <section className="container mx-auto max-w-6xl px-6 py-20 md:py-28 lg:py-32">
                        <div className="mx-auto max-w-4xl text-center">
                          <EditableText
                            className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
                            value={home.heroTitle ?? DEFAULT_HOME.heroTitle}
                            onChange={(value) => setHome((prev) => ({ ...prev, heroTitle: value }))}
                          />
                          <EditableText
                            className="mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl"
                            value={home.heroSubtitle ?? DEFAULT_HOME.heroSubtitle}
                            onChange={(value) => setHome((prev) => ({ ...prev, heroSubtitle: value }))}
                          />
                          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                            <Button size="lg">{home.ctaPrimaryText ?? DEFAULT_HOME.ctaPrimaryText}</Button>
                            <Button size="lg" variant="outline">{home.ctaSecondaryText ?? DEFAULT_HOME.ctaSecondaryText}</Button>
                            <Button size="lg" variant="outline">{home.ctaContactText ?? DEFAULT_HOME.ctaContactText}</Button>
                          </div>
                        </div>
                      </section>
                    </SortableBlock>
                  );
                }
                if (id === "latestPosts" && payload.kind === "home") {
                  return (
                    <SortableBlock key={id} id={id}>
                      <section className="container mx-auto max-w-6xl px-6 py-16">
                        <h2 className="mb-8 text-3xl font-bold text-foreground">Latest Articles</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {payload.latestPosts.map((post) => (
                            <Card key={post.id} className="h-full border-border/80">
                              <CardContent className="space-y-3 p-6">
                                <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
                                  {post.pinned ? "Pinned - " : ""}
                                  {post.title}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{formatDate(post.createdAt)}</span>
                                  <span>•</span>
                                  <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                                </div>
                                {post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {post.tags.map((tag) => (
                                      <Badge key={tag.id} variant="secondary" className="text-xs">
                                        {tag.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {post.description || stripMarkdown(post.content).slice(0, 150)}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </section>
                    </SortableBlock>
                  );
                }
                return (
                  <SortableBlock key={id} id={id}>
                    <section className="container mx-auto max-w-6xl px-6 py-16">
                      <div className="mx-auto max-w-4xl">
                        <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Technical Skills</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                          {(home.skills && home.skills.length > 0 ? home.skills : DEFAULT_HOME.skills).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-4 py-2 text-sm font-medium text-foreground/90">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </section>
                  </SortableBlock>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {payload.kind === "contact" && (
        <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/60">
          <section className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
            <EditableText
              className="mb-4 text-4xl font-bold text-foreground"
              value="Contact"
              onChange={() => undefined}
            />
            <EditableText
              className="mb-2 text-muted-foreground"
              value={contact.intro ?? "I'm open to new opportunities, collaborations, or a chat about tech."}
              onChange={(value) => setContact((prev) => ({ ...prev, intro: value }))}
            />
            <EditableText
              className="mb-10 text-sm text-muted-foreground"
              value={contact.formNote ?? "Use the form below, or email me directly at hello@example.com."}
              onChange={(value) => setContact((prev) => ({ ...prev, formNote: value }))}
            />
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Form block (live frontend style preview)</p>
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {payload.kind === "about" && (
        <section className="container mx-auto max-w-5xl px-6 py-12">
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                {about.profileImage ? (
                  <button
                    type="button"
                    className="mb-6 inline-block rounded-full border-2 border-border p-1 hover:border-muted-foreground/35"
                    onClick={() => setMediaOpen(true)}
                  >
                    <div className="relative h-32 w-32 overflow-hidden rounded-full">
                      <Image src={about.profileImage} alt="Profile" fill unoptimized className="object-cover" />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground hover:border-muted-foreground/45"
                    onClick={() => setMediaOpen(true)}
                  >
                    <ImageIcon className="h-8 w-8" />
                  </button>
                )}
                <EditableText
                  className="mb-2 text-4xl font-bold text-foreground"
                  value={about.heroName ?? "Your Name"}
                  onChange={(value) => setAbout((prev) => ({ ...prev, heroName: value }))}
                />
                <EditableText
                  className="mb-2 text-lg text-muted-foreground"
                  value={about.heroTagline ?? "Builder Owner | Product Creator"}
                  onChange={(value) => setAbout((prev) => ({ ...prev, heroTagline: value }))}
                />
                <EditableText
                  className="mx-auto mt-6 max-w-4xl text-left text-foreground/90"
                  value={about.introText ?? "Write your intro here."}
                  onChange={(value) => setAbout((prev) => ({ ...prev, introText: value }))}
                />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {payload.kind === "custom" && (
        <section className="container mx-auto max-w-4xl px-4 py-12">
          <Card className="shadow-lg">
            <CardContent className="space-y-6 p-6">
              <EditableText
                className="text-3xl font-bold text-foreground"
                value={custom.title ?? "Untitled"}
                onChange={(value) => setCustom((prev) => ({ ...prev, title: value }))}
              />
              <EditableText
                className="min-h-[260px] whitespace-pre-wrap text-foreground/90"
                value={custom.content ?? ""}
                onChange={(value) => setCustom((prev) => ({ ...prev, content: value }))}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {isLoggedIn && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-3 shadow-[var(--glass-shadow-hover)] backdrop-blur-xl">
          <Link href={`/${payload.slug === "home" ? "" : payload.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              View Live
            </Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save & Publish"}
          </Button>
          {status ? <span className="text-xs text-[var(--muted-foreground)]">{status}</span> : null}
        </div>
      )}

      {payload.kind === "about" && (
        <InsertMediaModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(url) => setAbout((prev) => ({ ...prev, profileImage: url }))}
        />
      )}
    </div>
  );
}
