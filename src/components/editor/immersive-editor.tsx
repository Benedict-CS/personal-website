"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import {
  GripVertical,
  Image as ImageIcon,
  Save,
  Send,
  Upload,
  Check,
  Focus,
  Command,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { SiteBlockBuilder } from "@/components/site-block-builder";
import { ImmersiveCustomMarkdownField } from "@/components/editor/immersive-custom-markdown-field";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ContentEditableField } from "@/components/editor/content-editable-field";
import { DevBlockMutedNotice } from "@/components/dev-blocks/dev-block-muted-notice";
import { EditorImmersiveHeader } from "@/components/editor/editor-immersive-header";
import { DashboardEmptyState, DashboardKbd } from "@/components/dashboard/dashboard-ui";
import { TooltipHint } from "@/components/ui/tooltip-hint";
import { publicSiteContainerClassName } from "@/components/public/public-layout";
import type { EditorTarget } from "@/lib/editor-route";
import { cn } from "@/lib/utils";
import { stableStringify } from "@/lib/stable-stringify";
import { subscribeCmsMediaInsert } from "@/lib/cms-media-insert";
import { extractMarkdownHeadingOutline } from "@/lib/markdown-heading-outline";
import { sanitizeSlugForStorage, validateCustomPageDraft } from "@/lib/editor-validation";
import { useLeaveGuard } from "@/contexts/leave-guard-context";
import { useToast } from "@/contexts/toast-context";
import { getContentMetrics } from "@/lib/content-metrics";

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

const PREMIUM_MOTION_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const PREMIUM_MOTION_DURATION = 0.35;

const PREVIEW_FRAME_KEY = "immersive-editor-preview-frame";
type EditorPreviewFrame = "site" | "tablet" | "mobile";

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
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-ring/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-border/70 bg-card/85 text-muted-foreground shadow-[var(--elevation-1)] backdrop-blur-md transition-colors hover:bg-card hover:text-foreground active:cursor-grabbing"
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

export function ImmersiveEditor({ target }: { target: EditorTarget }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rawPreviewRef = useRef<HTMLDivElement | null>(null);
  const syncScrollLockRef = useRef<"input" | "preview" | null>(null);

  const [home, setHome] = useState<HomeContent>(defaultHome);
  const [contact, setContact] = useState<ContactContent>(defaultContact);
  const [about, setAbout] = useState<AboutContent>({});
  const [customPage, setCustomPage] = useState<CustomPageContent | null>(null);
  const [customEditorMode, setCustomEditorMode] = useState<"builder" | "raw">("builder");
  /** Dims chrome while editing raw markdown on custom pages (writing focus). */
  const [writingFocus, setWritingFocus] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<EditorPreviewFrame>(() => {
    if (typeof window === "undefined") return "site";
    try {
      const raw = sessionStorage.getItem(PREVIEW_FRAME_KEY);
      if (raw === "tablet" || raw === "mobile") return raw;
    } catch {
      /* ignore */
    }
    return "site";
  });
  /** Auto-dim secondary UI while typing in raw markdown (distraction-free without toggling focus mode). */
  const [immersiveTypingDim, setImmersiveTypingDim] = useState(false);
  const immersiveTypingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const previewActive = target.kind === "custom-page";

  const [isEditing] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved-draft" | "published" | "error">("idle");
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRequestIdRef = useRef(0);
  /** Matches last saved or loaded snapshot so we can show unsaved UI (tab title + floating bar). */
  const editorBaselineRef = useRef<string | null>(null);
  const savedDocumentTitleRef = useRef<string | null>(null);
  const lastCustomPageAutosaveRef = useRef<string | null>(null);
  const initialServerCustomRef = useRef<string | null>(null);
  const [localDraftBanner, setLocalDraftBanner] = useState<"hidden" | "offer" | "restored">("hidden");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { setDirty: setLeaveGuardDirty, registerHandler: registerLeaveHandler } = useLeaveGuard();
  const { toast } = useToast();

  const onCustomPageMarkdownChange = useCallback((next: string) => {
    startTransition(() => {
      setCustomPage((current) => (current ? { ...current, content: next } : current));
    });
  }, []);

  const onCustomPageBlockChange = useCallback((nextMarkdown: string) => {
    startTransition(() => {
      setCustomPage((current) => (current ? { ...current, content: nextMarkdown } : current));
    });
  }, []);

  /** ContentEditableField already defers parent updates via startTransition on input. */
  const patchHome = useCallback((updater: (c: HomeContent) => HomeContent) => {
    setHome(updater);
  }, []);

  const patchContact = useCallback((updater: (c: ContactContent) => ContactContent) => {
    setContact(updater);
  }, []);

  const patchAbout = useCallback((updater: (c: AboutContent) => AboutContent) => {
    setAbout(updater);
  }, []);

  const patchCustomPageTitle = useCallback((title: string) => {
    setCustomPage((current) => (current ? { ...current, title } : current));
  }, []);

  const clearImmersiveTypingTimer = useCallback(() => {
    if (immersiveTypingIdleRef.current) {
      clearTimeout(immersiveTypingIdleRef.current);
      immersiveTypingIdleRef.current = null;
    }
  }, []);

  const pulseImmersiveTypingChrome = useCallback(() => {
    if (writingFocus) return;
    startTransition(() => setImmersiveTypingDim(true));
    clearImmersiveTypingTimer();
    immersiveTypingIdleRef.current = setTimeout(() => {
      startTransition(() => setImmersiveTypingDim(false));
      immersiveTypingIdleRef.current = null;
    }, 2200);
  }, [clearImmersiveTypingTimer, writingFocus]);

  const endImmersiveTypingChrome = useCallback(() => {
    clearImmersiveTypingTimer();
    startTransition(() => setImmersiveTypingDim(false));
  }, [clearImmersiveTypingTimer]);

  useEffect(() => () => clearImmersiveTypingTimer(), [clearImmersiveTypingTimer]);

  useEffect(() => {
    try {
      sessionStorage.setItem(PREVIEW_FRAME_KEY, previewFrame);
    } catch {
      /* ignore */
    }
  }, [previewFrame]);

  useEffect(() => {
    if (customEditorMode !== "raw") endImmersiveTypingChrome();
  }, [customEditorMode, endImmersiveTypingChrome]);

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

  useEffect(() => {
    if (target.kind !== "custom-page") return;
    return subscribeCmsMediaInsert((md) => {
      setCustomPage((c) =>
        c
          ? {
              ...c,
              content: `${c.content}${c.content.trim() ? "\n\n" : ""}${md.trim()}\n\n`,
            }
          : c
      );
    });
  }, [target.kind]);

  const sectionOrder = useMemo(() => {
    const raw = home.sectionOrder ?? HOME_SECTION_IDS;
    return raw.filter((id) => HOME_SECTION_IDS.includes(id as (typeof HOME_SECTION_IDS)[number]));
  }, [home.sectionOrder]);

  const getEditorSnapshot = useCallback((): string | null => {
    if (target.kind === "home") {
      return stableStringify({ ...home, sectionOrder, sectionVisibility: home.sectionVisibility ?? {} });
    }
    if (target.kind === "contact") return stableStringify(contact);
    if (target.kind === "about") return stableStringify(about);
    if (target.kind === "custom-page") return customPage ? stableStringify(customPage) : null;
    return null;
  }, [target.kind, home, contact, about, customPage, sectionOrder]);

  const isDirty = useMemo(() => {
    if (loading) return false;
    const snap = getEditorSnapshot();
    if (snap === null || editorBaselineRef.current === null) return false;
    return snap !== editorBaselineRef.current;
  }, [loading, getEditorSnapshot]);

  useEffect(() => {
    editorBaselineRef.current = null;
  }, [target]);

  useEffect(() => {
    if (loading) return;
    const snap = getEditorSnapshot();
    if (snap !== null && editorBaselineRef.current === null) {
      editorBaselineRef.current = snap;
      if (target.kind === "custom-page" && customPage) {
        lastCustomPageAutosaveRef.current = stableStringify({
          id: customPage.id,
          title: customPage.title,
          content: customPage.content,
          slug: customPage.slug,
          published: customPage.published,
        });
      }
    }
  }, [loading, getEditorSnapshot, target.kind, customPage]);

  useEffect(() => {
    if (!isDirty) {
      if (savedDocumentTitleRef.current !== null) {
        document.title = savedDocumentTitleRef.current;
        savedDocumentTitleRef.current = null;
      }
      return;
    }
    if (savedDocumentTitleRef.current === null) {
      savedDocumentTitleRef.current = document.title;
    }
    const label =
      target.kind === "home"
        ? "Home"
        : target.kind === "contact"
          ? "Contact"
          : target.kind === "about"
            ? "About"
            : target.kind === "custom-page"
              ? customPage?.title?.trim() || "Page"
              : "Editor";
    document.title = `Unsaved · ${label}`;
  }, [isDirty, target.kind, customPage?.title]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || syncStatus === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, syncStatus]);

  useEffect(() => {
    setLeaveGuardDirty(isDirty || syncStatus === "saving");
  }, [isDirty, setLeaveGuardDirty, syncStatus]);

  useEffect(() => {
    registerLeaveHandler((url) => {
      const shouldLeave = window.confirm(
        "You still have unsaved changes or an in-flight save. Leave this editor anyway?"
      );
      if (!shouldLeave) return;
      setLeaveGuardDirty(false);
      window.location.assign(url);
    });
    return () => registerLeaveHandler(null);
  }, [registerLeaveHandler, setLeaveGuardDirty]);

  useEffect(() => {
    return () => {
      if (savedDocumentTitleRef.current !== null) {
        document.title = savedDocumentTitleRef.current;
        savedDocumentTitleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    initialServerCustomRef.current = null;
    setLocalDraftBanner("hidden");
  }, [customPage?.id]);

  useEffect(() => {
    if (target.kind !== "custom-page" || !customPage || loading) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          `immersive-custom-draft:${customPage.id}`,
          JSON.stringify({
            content: customPage.content,
            title: customPage.title,
            savedAt: Date.now(),
          })
        );
      } catch {
        // storage full or disabled
      }
    }, 400);
    return () => clearTimeout(t);
  }, [target.kind, customPage, loading]);

  useEffect(() => {
    if (target.kind !== "custom-page" || !customPage || loading) return;
    if (initialServerCustomRef.current !== null) return;
    initialServerCustomRef.current = customPage.content;
    try {
      const raw = localStorage.getItem(`immersive-custom-draft:${customPage.id}`);
      if (!raw) return;
      const d = JSON.parse(raw) as { content?: string };
      if (typeof d.content === "string" && d.content.length > 0 && d.content !== customPage.content) {
        setLocalDraftBanner("offer");
      }
    } catch {
      // ignore
    }
  }, [target.kind, customPage, loading]);

  const persistChanges = useCallback(
    async (mode: "autosave" | "manual") => {
      if (loading) return false;
      if (mode === "manual") setSaving(true);
      setSyncStatus("saving");
      setMessage(mode === "manual" ? "Saving changes..." : "Auto-saving draft...");
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
          const validation = validateCustomPageDraft({
            title: customPage.title,
            slug: customPage.slug,
            content: customPage.content,
            currentSlug: customPage.slug,
          });
          if (!validation.valid) {
            if (mode === "manual") {
              setMessage("Fix validation errors before saving.");
            }
            setSyncStatus("error");
            return false;
          }
          const res = await fetch(`/api/custom-pages/id/${customPage.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: sanitizeSlugForStorage(customPage.slug),
              title: customPage.title,
              content: customPage.content,
              published: customPage.published,
            }),
          });
          if (!res.ok) throw new Error("save failed");
        }

        const snap = getEditorSnapshot();
        if (snap !== null) editorBaselineRef.current = snap;
        if (target.kind === "custom-page" && customPage) {
          lastCustomPageAutosaveRef.current = stableStringify({
            id: customPage.id,
            title: customPage.title,
            content: customPage.content,
            slug: customPage.slug,
            published: customPage.published,
          });
        }
        setSavedAt(Date.now());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          setSavedAt(null);
          savedTimeoutRef.current = null;
        }, 2400);

        const isPublishedManual = mode === "manual" && target.kind === "custom-page" && Boolean(customPage?.published);
        setSyncStatus(isPublishedManual ? "published" : "saved-draft");
        if (isPublishedManual && customPage?.slug) {
          setMessage("Published to live site.");
          toast(
            <span>
              Published successfully.{" "}
              <a
                href={`/page/${customPage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                View live page
              </a>
            </span>,
            "success"
          );
        } else {
          setMessage("Saved to draft.");
        }
        return true;
      } catch {
        setSyncStatus("error");
        setMessage("Save failed. Your local draft is preserved.");
        return false;
      } finally {
        if (mode === "manual") setSaving(false);
      }
    },
    [about, contact, customPage, getEditorSnapshot, home, loading, sectionOrder, target.kind, toast]
  );

  useEffect(() => {
    if (loading || !isDirty || saving) return;
    autosaveRequestIdRef.current += 1;
    const requestId = autosaveRequestIdRef.current;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (requestId !== autosaveRequestIdRef.current) return;
      void persistChanges("autosave");
    }, 1400);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [isDirty, loading, persistChanges, saving]);

  const saveAndPublish = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistChanges("manual");
  }, [persistChanges]);

  const jumpToHeading = useCallback((line: number) => {
    const ta = rawTextareaRef.current;
    if (!ta) return;
    const text = ta.value;
    let currentLine = 1;
    let index = 0;
    while (currentLine < line && index < text.length) {
      if (text[index] === "\n") currentLine += 1;
      index += 1;
    }
    ta.focus();
    ta.setSelectionRange(index, index);
    ta.scrollTop = Math.max(0, ta.scrollHeight * ((line - 1) / Math.max(1, text.split("\n").length)));
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "s") return;
      if (loading || saving) return;
      event.preventDefault();
      void saveAndPublish();
    };
    window.addEventListener("keydown", onSaveShortcut);
    return () => window.removeEventListener("keydown", onSaveShortcut);
  }, [loading, saving, saveAndPublish]);

  useEffect(() => {
    const onCommandPaletteShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setCommandPaletteOpen(true);
    };
    window.addEventListener("keydown", onCommandPaletteShortcut);
    return () => window.removeEventListener("keydown", onCommandPaletteShortcut);
  }, []);

  useEffect(() => {
    if (!writingFocus && !commandPaletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        else setWritingFocus(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandPaletteOpen, writingFocus]);

  useEffect(() => {
    if (target.kind !== "custom-page" || customEditorMode !== "raw") return;
    const inputEl = rawTextareaRef.current;
    const previewEl = rawPreviewRef.current;
    if (!inputEl || !previewEl) return;

    const ratio = (el: HTMLElement) => {
      const max = el.scrollHeight - el.clientHeight;
      return max <= 0 ? 0 : el.scrollTop / max;
    };

    const applyRatio = (el: HTMLElement, value: number) => {
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.max(0, Math.min(max, max * value));
    };

    const onInputScroll = () => {
      if (syncScrollLockRef.current === "preview") return;
      syncScrollLockRef.current = "input";
      applyRatio(previewEl, ratio(inputEl));
      window.setTimeout(() => {
        if (syncScrollLockRef.current === "input") syncScrollLockRef.current = null;
      }, 40);
    };

    const onPreviewScroll = () => {
      if (syncScrollLockRef.current === "input") return;
      syncScrollLockRef.current = "preview";
      applyRatio(inputEl, ratio(previewEl));
      window.setTimeout(() => {
        if (syncScrollLockRef.current === "preview") syncScrollLockRef.current = null;
      }, 40);
    };

    inputEl.addEventListener("scroll", onInputScroll, { passive: true });
    previewEl.addEventListener("scroll", onPreviewScroll, { passive: true });

    return () => {
      inputEl.removeEventListener("scroll", onInputScroll);
      previewEl.removeEventListener("scroll", onPreviewScroll);
      syncScrollLockRef.current = null;
    };
  }, [customEditorMode, target.kind]);

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
    startTransition(() => {
      setHome((current) => ({ ...current, sectionOrder: arrayMove(sectionOrder, oldIndex, newIndex) }));
    });
  }

  const dimSecondaryChrome =
    target.kind === "custom-page" &&
    customEditorMode === "raw" &&
    !writingFocus &&
    immersiveTypingDim;
  const secondaryEditorOpacity = dimSecondaryChrome ? (reduceMotion ? 0.78 : 0.42) : 1;
  const deferredCustomMarkdown = useDeferredValue(
    target.kind === "custom-page" ? (customPage?.content ?? "") : ""
  );
  const customRawStats = useMemo(() => {
    if (target.kind !== "custom-page" || !customPage) return null;
    const metrics = getContentMetrics(deferredCustomMarkdown);
    const headings = (deferredCustomMarkdown.match(/^#{1,6}\s+/gm) ?? []).length;
    return { ...metrics, headings };
  }, [customPage, deferredCustomMarkdown, target.kind]);
  const customHeadingOutline = useMemo(() => {
    if (target.kind !== "custom-page" || customEditorMode !== "raw") return [];
    return extractMarkdownHeadingOutline(deferredCustomMarkdown);
  }, [customEditorMode, deferredCustomMarkdown, target.kind]);
  const customPageValidation = useMemo(() => {
    if (target.kind !== "custom-page" || !customPage) return null;
    return validateCustomPageDraft({
      title: customPage.title,
      slug: customPage.slug,
      content: customPage.content,
      currentSlug: customPage.slug,
    });
  }, [customPage, target.kind]);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background pb-36 pt-6">
        <div className={cn(publicSiteContainerClassName, "py-10")}>
          <div className="space-y-4">
            <div className="h-9 w-48 max-w-[60%] rounded-lg bg-muted/55 motion-safe:animate-pulse" />
            <div className="h-12 w-full max-w-xl rounded-lg bg-muted/40 motion-safe:animate-pulse" />
            <div className="h-72 w-full rounded-xl border border-border/60 bg-card/80 p-4">
              <div className="h-3 w-full rounded bg-muted/35 motion-safe:animate-pulse" />
              <div className="mt-3 h-3 w-[92%] rounded bg-muted/30 motion-safe:animate-pulse" />
              <div className="mt-3 h-3 w-[88%] rounded bg-muted/25 motion-safe:animate-pulse" />
              <div className="mt-3 h-3 w-[70%] rounded bg-muted/20 motion-safe:animate-pulse" />
            </div>
            <div className="h-10 w-36 rounded-md bg-muted/45 motion-safe:animate-pulse" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Loading editor…</p>
        </div>
      </div>
    );
  }

  const pagePath =
    target.kind === "home"
      ? "/"
      : target.kind === "about"
        ? "/about"
        : target.kind === "contact"
          ? "/contact"
          : `/page/${target.slug}`;
  const focusProgress =
    target.kind === "custom-page" && customPage
      ? Math.min(100, (customPage.content.length / 12000) * 100)
      : 0;

  return (
    <div className={`relative min-h-screen pb-36 pt-6 bg-background ${isEditing ? "editor-grid-overlay" : ""}`}>
      <AnimatePresence>
        {writingFocus && target.kind === "custom-page" && customEditorMode === "raw" ? (
          <motion.button
            key="writing-focus-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 cursor-default border-0 bg-background/[0.92] p-0 backdrop-blur-[6px]"
            aria-label="Exit writing focus"
            onClick={() => setWritingFocus(false)}
          />
        ) : null}
        {commandPaletteOpen ? (
          <motion.button
            key="command-palette-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[65] border-0 bg-background/70 p-0 backdrop-blur-[2px]"
            aria-label="Close command palette"
            onClick={() => setCommandPaletteOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      {writingFocus && target.kind === "custom-page" && customEditorMode === "raw" ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[45] h-[3px] overflow-hidden bg-muted/50 shadow-[var(--elevation-1)]"
          role="progressbar"
          aria-valuenow={Math.round(focusProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Draft length indicator"
        >
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${focusProgress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
          />
        </div>
      ) : null}
      <div
        className={cn(
          !previewActive || previewFrame === "site"
            ? cn(publicSiteContainerClassName, "py-10")
            : "mx-auto w-full min-h-[calc(min(72vh,820px)+2.25rem)] px-3 py-10 transition-[max-width] duration-300 ease-out sm:px-5",
          previewActive &&
            previewFrame === "tablet" &&
            "max-w-[min(100%,820px)] rounded-xl border border-border/60 bg-background/40 shadow-[var(--elevation-1)]",
          previewActive &&
            previewFrame === "mobile" &&
            "max-w-[min(100%,400px)] rounded-xl border border-border/60 bg-background/40 shadow-[var(--elevation-1)]",
        )}
      >
        {previewActive && previewFrame !== "site" ? (
          <motion.div
            key={previewFrame}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: PREMIUM_MOTION_EASE }}
            className="relative -mx-px -mt-px mb-0 flex h-9 shrink-0 items-center justify-between gap-2 rounded-t-xl border-b border-border/55 bg-gradient-to-b from-muted/45 to-muted/25 px-3 text-[10px] font-medium tabular-nums text-muted-foreground"
            aria-hidden
          >
            {previewFrame === "mobile" ? (
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-1.5 w-[4.5rem] -translate-x-1/2 rounded-b-md bg-foreground/12"
                aria-hidden
              />
            ) : null}
            <span className="min-w-[2.25rem]">9:41</span>
            <span className="truncate text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
              {previewFrame === "mobile" ? "Live preview" : "Tablet preview"}
            </span>
            <span className="flex min-w-[2.25rem] items-center justify-end gap-1" aria-hidden>
              <span className="h-1.5 w-4 rounded-sm bg-foreground/12" />
              <span className="h-2 w-2 rounded-full border border-foreground/20 bg-transparent" />
            </span>
          </motion.div>
        ) : null}
        <EditorImmersiveHeader target={target} customPageTitle={customPage?.title} />
        {target.kind === "home" && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-8">
                {sectionOrder.includes("hero") && (
                  <SortableSection id="hero" isEditing={isEditing}>
                    <section className="container mx-auto max-w-6xl px-6 py-20 md:py-28 lg:py-32">
                      <div className="mx-auto max-w-4xl text-center">
                        <ContentEditableField
                          value={home.heroTitle ?? defaultHome.heroTitle ?? ""}
                          onChange={(value) => patchHome((current) => ({ ...current, heroTitle: value }))}
                          className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
                          placeholder="Hero title"
                        />
                        <ContentEditableField
                          value={home.heroSubtitle ?? defaultHome.heroSubtitle ?? ""}
                          onChange={(value) => patchHome((current) => ({ ...current, heroSubtitle: value }))}
                          className="mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl"
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
                      <h2 className="mb-8 text-3xl font-bold text-foreground">Latest Articles</h2>
                      <div className="rounded-lg border border-border bg-background p-12 text-center text-muted-foreground">
                        Live post cards render on the public page. This block is reorderable in editor mode.
                      </div>
                    </section>
                  </SortableSection>
                )}
                {sectionOrder.includes("skills") && (
                  <SortableSection id="skills" isEditing={isEditing}>
                    <section className="container mx-auto max-w-6xl px-6 py-16">
                      <div className="mx-auto max-w-4xl">
                        <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Technical Skills</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                          {(home.skills ?? defaultHome.skills ?? []).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-4 py-2 text-sm font-medium text-foreground">
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
            <ContentEditableField
              value={contact.intro ?? defaultContact.intro ?? ""}
              onChange={(value) => patchContact((current) => ({ ...current, intro: value }))}
              className="mb-4 text-lg text-muted-foreground"
              placeholder="Contact intro text"
            />
            <ContentEditableField
              value={contact.formNote ?? defaultContact.formNote ?? ""}
              onChange={(value) => patchContact((current) => ({ ...current, formNote: value }))}
              className="mb-10 text-sm text-muted-foreground"
              placeholder="Contact form note"
            />
            <Card className="shadow-[var(--elevation-3)]">
              <CardContent className="pt-6 text-foreground">
                Contact form block (live behavior remains on public route).
              </CardContent>
            </Card>
            <p className="mt-4 text-xs text-muted-foreground">
              Form delivery (recipient email, HTTPS webhooks) is configured in{" "}
              <Link
                href="/dashboard/content/site"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Site settings
              </Link>
              .
            </p>
          </section>
        )}

        {target.kind === "about" && (
          <section className="container mx-auto max-w-5xl px-6 py-12">
            <Card className="shadow-[var(--elevation-3)]">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMediaOpen(true)}
                    className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-muted-foreground hover:border-ring"
                  >
                    {about.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL from editor
                    <img src={about.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10" />
                  )}
                  </button>
                  <ContentEditableField
                    value={about.heroName?.trim() || "Your name"}
                    onChange={(value) => patchAbout((current) => ({ ...current, heroName: value }))}
                    className="mb-2 text-4xl font-bold text-foreground"
                    placeholder="Hero name"
                  />
                  <ContentEditableField
                    value={about.heroTagline?.trim() || "Your tagline"}
                    onChange={(value) => patchAbout((current) => ({ ...current, heroTagline: value }))}
                    className="mb-4 text-lg text-muted-foreground"
                    placeholder="Hero tagline"
                  />
                  <ContentEditableField
                    value={about.introText?.trim() || "Write an intro..."}
                    onChange={(value) => patchAbout((current) => ({ ...current, introText: value }))}
                    className="mx-auto max-w-3xl text-left text-foreground"
                    placeholder="Intro text"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {target.kind === "custom-page" && (
          <section
            className={`container mx-auto max-w-4xl px-4 py-12 ${
              writingFocus && customEditorMode === "raw" ? "relative z-50" : ""
            }`}
          >
            {!customPage ? (
              <DashboardEmptyState
                title="Page not found"
                description={
                  <>
                    Create it in{" "}
                    <Link href="/dashboard/content/pages" className="font-medium text-foreground underline underline-offset-2">
                      Custom pages
                    </Link>{" "}
                    or open another slug.
                  </>
                }
              />
            ) : (
              <Card className="shadow-[var(--elevation-3)]">
                <CardContent className="space-y-4 pt-6">
                  <motion.div
                    animate={{ opacity: secondaryEditorOpacity }}
                    transition={{ duration: PREMIUM_MOTION_DURATION, ease: PREMIUM_MOTION_EASE }}
                    className="space-y-4"
                  >
                    <ContentEditableField
                      value={customPage.title}
                      onChange={(value) => patchCustomPageTitle(value)}
                      className="text-3xl font-bold text-foreground"
                      placeholder="Page title"
                    />
                    {customPageValidation?.errors.title ? (
                      <p className="text-xs text-rose-700" role="status" aria-live="polite">
                        {customPageValidation.errors.title}
                      </p>
                    ) : null}
                    {customPageValidation?.errors.slug ? (
                      <p className="text-xs text-rose-700" role="status" aria-live="polite">
                        {customPageValidation.errors.slug}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={customEditorMode === "builder" ? "default" : "outline"}
                        onClick={() => {
                          setWritingFocus(false);
                          setCustomEditorMode("builder");
                        }}
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
                      {customEditorMode === "raw" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={writingFocus ? "default" : "outline"}
                          className="gap-1.5"
                          onClick={() => setWritingFocus((w) => !w)}
                          title="Dim the rest of the UI while you write. Esc to exit."
                        >
                          <Focus className="h-3.5 w-3.5" aria-hidden />
                          {writingFocus ? "Exit focus" : "Writing focus"}
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                  {customEditorMode === "builder" ? (
                    <SiteBlockBuilder value={customPage.content} onChange={onCustomPageBlockChange} />
                  ) : (
                    <div className="space-y-3">
                      {localDraftBanner === "offer" ? (
                        <DevBlockMutedNotice>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>A local draft differs from the last saved version.</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  try {
                                    const raw = localStorage.getItem(`immersive-custom-draft:${customPage.id}`);
                                    if (!raw) return;
                                    const d = JSON.parse(raw) as { content?: string; title?: string };
                                    setCustomPage((c) =>
                                      c
                                        ? {
                                            ...c,
                                            content: typeof d.content === "string" ? d.content : c.content,
                                            title: typeof d.title === "string" ? d.title : c.title,
                                          }
                                        : c
                                    );
                                    setLocalDraftBanner("restored");
                                  } catch {
                                    // ignore
                                  }
                                }}
                              >
                                Restore local draft
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setLocalDraftBanner("hidden")}
                              >
                                Keep server version
                              </Button>
                            </div>
                          </div>
                        </DevBlockMutedNotice>
                      ) : null}
                      {localDraftBanner === "restored" ? (
                        <p className="text-sm text-emerald-800">Local draft restored. Save when you are ready.</p>
                      ) : null}
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3">
                          <ImmersiveCustomMarkdownField
                            content={customPage.content}
                            onContentChange={onCustomPageMarkdownChange}
                            placeholder="Type '/' for commands or start writing your markdown here..."
                            aria-label="Raw markdown body"
                            textareaRef={rawTextareaRef}
                            onTypingPulse={pulseImmersiveTypingChrome}
                            onTypingEnd={endImmersiveTypingChrome}
                          />
                          {customPageValidation?.errors.content ? (
                            <p className="text-xs text-rose-700" role="status" aria-live="polite">
                              {customPageValidation.errors.content}
                            </p>
                          ) : null}
                          {customHeadingOutline.length > 0 ? (
                            <div className="rounded-lg border border-border bg-card/70 p-3">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Heading outline
                              </p>
                              <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
                                {customHeadingOutline.map((heading) => (
                                  <li key={`${heading.line}-${heading.text}`}>
                                    <button
                                      type="button"
                                      onClick={() => jumpToHeading(heading.line)}
                                      className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-muted/60"
                                      style={{ paddingLeft: `${Math.max(0, (heading.depth - 1) * 10 + 8)}px` }}
                                    >
                                      {heading.text}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
                          <div
                            ref={rawPreviewRef}
                            className="max-h-[32rem] overflow-y-auto rounded-lg border border-border bg-card p-4 [contain:layout]"
                          >
                            <MarkdownRenderer content={customPage.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <motion.label
                    animate={{ opacity: secondaryEditorOpacity }}
                    transition={{ duration: PREMIUM_MOTION_DURATION, ease: PREMIUM_MOTION_EASE }}
                    className="inline-flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={customPage.published}
                      onChange={(event) =>
                        setCustomPage((current) =>
                          current
                            ? {
                                ...current,
                                published: event.target.checked,
                                slug: sanitizeSlugForStorage(current.slug || current.title),
                              }
                            : current
                        )
                      }
                    />
                    Published
                  </motion.label>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </div>

      <motion.div
        animate={{ opacity: secondaryEditorOpacity }}
        transition={{ duration: PREMIUM_MOTION_DURATION, ease: PREMIUM_MOTION_EASE }}
        className={`fixed bottom-4 right-4 flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 p-3 shadow-[var(--elevation-3)] backdrop-blur-xl ${
          writingFocus && target.kind === "custom-page" ? "z-[60]" : "z-50"
        }`}
      >
        <TooltipHint label="Immersive editor — saves sync to the server when you use Save or publish controls." side="top">
          <span className="inline-flex cursor-default rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Editor Mode
          </span>
        </TooltipHint>
        {previewActive ? (
          <div
            className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/25 p-0.5"
            role="group"
            aria-label="Preview width"
          >
            <TooltipHint label="Site width — default container" side="top">
              <Button
                type="button"
                size="icon"
                variant={previewFrame === "site" ? "secondary" : "ghost"}
                className="h-8 w-8 shrink-0"
                aria-pressed={previewFrame === "site"}
                onClick={() => setPreviewFrame("site")}
              >
                <Monitor className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipHint>
            <TooltipHint label="Tablet frame (~820px)" side="top">
              <Button
                type="button"
                size="icon"
                variant={previewFrame === "tablet" ? "secondary" : "ghost"}
                className="h-8 w-8 shrink-0"
                aria-pressed={previewFrame === "tablet"}
                onClick={() => setPreviewFrame("tablet")}
              >
                <Tablet className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipHint>
            <TooltipHint label="Mobile frame (~400px)" side="top">
              <Button
                type="button"
                size="icon"
                variant={previewFrame === "mobile" ? "secondary" : "ghost"}
                className="h-8 w-8 shrink-0"
                aria-pressed={previewFrame === "mobile"}
                onClick={() => setPreviewFrame("mobile")}
              >
                <Smartphone className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipHint>
          </div>
        ) : null}
        {target.kind === "custom-page" && customEditorMode === "raw" && customRawStats ? (
          <span className="rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {customRawStats.words} words · {customRawStats.readingLabel} · {customRawStats.headings} headings
          </span>
        ) : null}
        {(saving || syncStatus === "saving") && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground" aria-live="polite">
            <Save className="h-3.5 w-3.5 animate-pulse" aria-hidden />
            Saving...
          </span>
        )}
        {!saving && syncStatus !== "saving" && isDirty && (
          <span
            className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900"
            aria-live="polite"
          >
            Unsaved changes
          </span>
        )}
        {!saving && syncStatus === "error" ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700" aria-live="polite">
            Save failed
          </span>
        ) : null}
        {!saving && syncStatus === "published" && !isDirty ? (
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800" aria-live="polite">
            Published
          </span>
        ) : null}
        {!saving && syncStatus === "saved-draft" && savedAt !== null && !isDirty && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Saved to draft
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
          <Button
            onClick={() => void saveAndPublish()}
            disabled={saving || (target.kind === "custom-page" && customPageValidation ? !customPageValidation.valid : false)}
            size="sm"
            className="gap-1.5"
            data-testid="floating-save-publish"
          >
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex" aria-label="Save shortcut">
            <DashboardKbd>Cmd/Ctrl+S</DashboardKbd>
          </span>
          <a href={pagePath}>
            <Button variant="outline" size="sm">Exit</Button>
          </a>
        </div>
        {message && <p className="mt-2 text-xs text-muted-foreground" role="status">{message}</p>}
      </motion.div>

      <AnimatePresence>
        {commandPaletteOpen ? (
          <motion.section
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16 }}
            role="dialog"
            aria-modal="true"
            aria-label="Editor command palette"
            className="fixed left-1/2 top-[15%] z-[70] w-[min(92vw,36rem)] -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Command className="h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Command palette</p>
              </div>
              <span className="text-xs text-muted-foreground">
                <DashboardKbd>Esc</DashboardKbd>
              </span>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/40"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  void saveAndPublish();
                }}
              >
                <span>Save changes</span>
                <DashboardKbd>Cmd/Ctrl+S</DashboardKbd>
              </button>
              <button
                type="button"
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/40"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  if (typeof window !== "undefined") {
                    window.open(pagePath, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <span>Open live preview</span>
                <DashboardKbd>New tab</DashboardKbd>
              </button>
              {target.kind === "custom-page" ? (
                <button
                  type="button"
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/40"
                  onClick={() => {
                    setCustomEditorMode((m) => (m === "builder" ? "raw" : "builder"));
                    setCommandPaletteOpen(false);
                  }}
                >
                  <span>{customEditorMode === "builder" ? "Switch to raw markdown mode" : "Switch to visual block mode"}</span>
                  <DashboardKbd>Toggle</DashboardKbd>
                </button>
              ) : null}
              {target.kind === "custom-page" && customEditorMode === "raw" ? (
                <button
                  type="button"
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/40"
                  onClick={() => {
                    setWritingFocus((current) => !current);
                    setCommandPaletteOpen(false);
                  }}
                >
                  <span>{writingFocus ? "Disable writing focus mode" : "Enable writing focus mode"}</span>
                  <DashboardKbd>Focus</DashboardKbd>
                </button>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

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
