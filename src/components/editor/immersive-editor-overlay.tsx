"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Move, Redo2, Save, Undo2 } from "lucide-react";
import { InsertMediaModal } from "@/components/insert-media-modal";

type EditorSlug = "home" | "about" | "blog" | "contact";
type TextBinding = { key: string; selector: string };
type ButtonDraft = { label: string; href: string };
type SiteDraft = { siteName: string; authorName: string; logoUrl: string };
type FooterDraft = { footerText: string };
type HomeSection = "hero" | "latestPosts" | "skills";
type HomeLayoutDraft = { sectionOrder: HomeSection[]; sectionVisibility: Record<HomeSection, boolean> };
type ContactButtonKey = "email" | "linkedin" | "github";
type ContactLayoutDraft = { buttonOrder: ContactButtonKey[]; buttonVisibility: Record<ContactButtonKey, boolean> };
type AboutBlockSection = "education" | "experience" | "volunteer" | "custom" | "project";
type AboutLayoutDraft = { sectionOrder: string[]; sectionVisibility: Record<string, boolean> };
type LocalEditorDraft = {
  version: 1;
  savedAt: number;
  slug: EditorSlug;
  text: Record<string, unknown>;
  buttonDrafts: Record<string, ButtonDraft>;
  logoDrafts: Record<string, string>;
  siteDraft: SiteDraft | null;
  footerDraft: FooterDraft | null;
  homeLayoutDraft: HomeLayoutDraft | null;
  homeSkillsDraft: string[] | null;
  contactLayoutDraft: ContactLayoutDraft | null;
  aboutLayoutDraft: AboutLayoutDraft | null;
};
type LocalEditorVersion = {
  id: string;
  savedAt: number;
  draft: LocalEditorDraft;
};
type ServerEditorRevision = {
  id: string;
  slug: string | null;
  mode: "draft" | "publish";
  createdAt: string;
  actor?: string | null;
  summary?: string | null;
};
type RecoverableLocalDraft = {
  label: string;
  draft: LocalEditorDraft;
};

const ABOUT_BLOCK_SECTION_PREFIX: Record<AboutBlockSection, string> = {
  education: "educationBlocks",
  experience: "experienceBlocks",
  volunteer: "volunteerBlocks",
  custom: "",
  project: "projectBlocks",
};

const EDITABLE_CLASS =
  "rounded-sm outline outline-2 outline-offset-2 outline-sky-300/70 transition-colors hover:outline-sky-500/80";
const EDITABLE_BUTTON_CLASS =
  "rounded-md outline outline-2 outline-offset-2 outline-sky-300/70 transition-colors hover:outline-sky-500/80 cursor-pointer";
const EDITABLE_LOGO_CLASS =
  "rounded-md outline outline-2 outline-offset-2 outline-sky-300/70 transition-colors hover:outline-sky-500/80 cursor-pointer";
const LOCAL_DRAFT_PREFIX = "immersive-editor-draft";
const LOCAL_VERSION_HISTORY_LIMIT = 20;

function getTextBindings(slug: EditorSlug): TextBinding[] {
  if (slug === "home") {
    return [
      { key: "heroTitle", selector: "main section h1" },
      { key: "heroSubtitle", selector: "main section h1 + p" },
      { key: "ctaPrimaryText", selector: "main section a:nth-of-type(1) button" },
      { key: "ctaSecondaryText", selector: "main section a:nth-of-type(2) button" },
      { key: "ctaContactText", selector: "main section a:nth-of-type(3) button" },
    ];
  }
  if (slug === "contact") {
    return [
      { key: "title", selector: "main h1" },
      { key: "intro", selector: "main h1 + p" },
      { key: "formNote", selector: "main h1 + p + p" },
    ];
  }
  return [];
}

function setDeepValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const nextPart = parts[i + 1];
    const nextIsIndex = /^\d+$/.test(nextPart ?? "");
    const index = Number(part);
    const isIndex = /^\d+$/.test(part);

    if (isLast) {
      if (isIndex && Array.isArray(cursor)) {
        cursor[index] = value;
      } else if (!isIndex && !Array.isArray(cursor)) {
        cursor[part] = value;
      }
      return;
    }

    if (isIndex) {
      if (!Array.isArray(cursor)) return;
      if (cursor[index] == null) {
        cursor[index] = nextIsIndex ? [] : {};
      }
      const nextCursor = cursor[index];
      if (typeof nextCursor !== "object" || nextCursor == null) return;
      cursor = nextCursor as Record<string, unknown> | unknown[];
    } else {
      if (Array.isArray(cursor)) return;
      if (cursor[part] == null) {
        cursor[part] = nextIsIndex ? [] : {};
      }
      const nextCursor = cursor[part];
      if (typeof nextCursor !== "object" || nextCursor == null) return;
      cursor = nextCursor as Record<string, unknown> | unknown[];
    }
  }
}

function getDeepValue(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") return undefined;
  const parts = path.split(".");
  let cursor: unknown = source;
  for (const part of parts) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number(part);
      if (!Number.isFinite(index)) return undefined;
      cursor = cursor[index];
      continue;
    }
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeBlocksPreservingMeta(
  existingBlocks: unknown,
  editedBlocks: unknown
): unknown {
  if (!Array.isArray(existingBlocks)) return editedBlocks;
  if (!Array.isArray(editedBlocks)) return existingBlocks;

  const makeKey = (item: unknown): string => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "";
    const rec = item as Record<string, unknown>;
    const title = String(rec.title ?? "").trim().toLowerCase();
    const org = String(rec.organization ?? "").trim().toLowerCase();
    const date = String(rec.dateRange ?? "").trim().toLowerCase();
    return `${title}::${org}::${date}`;
  };

  const existingByKey = new Map<string, Record<string, unknown>>();
  existingBlocks.forEach((item) => {
    const key = makeKey(item);
    if (!key || existingByKey.has(key) || typeof item !== "object" || !item || Array.isArray(item)) return;
    existingByKey.set(key, item as Record<string, unknown>);
  });

  return editedBlocks.map((editedItem, index) => {
    if (!editedItem || typeof editedItem !== "object" || Array.isArray(editedItem)) return editedItem;
    const editedRecord = editedItem as Record<string, unknown>;
    const key = makeKey(editedRecord);
    const matchedExisting =
      (key ? existingByKey.get(key) : undefined) ??
      (existingBlocks[index] && typeof existingBlocks[index] === "object" && !Array.isArray(existingBlocks[index])
        ? (existingBlocks[index] as Record<string, unknown>)
        : undefined);
    return matchedExisting ? { ...matchedExisting, ...editedRecord } : editedRecord;
  });
}

export function ImmersiveEditorOverlay({ slug }: { slug: EditorSlug }) {
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [mediaTarget, setMediaTarget] = useState<"content-image" | "site-logo" | "about-logo">("content-image");
  const [buttonDrafts, setButtonDrafts] = useState<Record<string, ButtonDraft>>({});
  const [logoDrafts, setLogoDrafts] = useState<Record<string, string>>({});
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);
  const [logoEditorKey, setLogoEditorKey] = useState("");
  const [siteDraft, setSiteDraft] = useState<SiteDraft | null>(null);
  const [siteEditorOpen, setSiteEditorOpen] = useState(false);
  const [siteNameInput, setSiteNameInput] = useState("");
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [siteLogoInput, setSiteLogoInput] = useState("");
  const [buttonEditorOpen, setButtonEditorOpen] = useState(false);
  const [buttonEditorTarget, setButtonEditorTarget] = useState<string>("");
  const [buttonEditorLabel, setButtonEditorLabel] = useState("");
  const [buttonEditorHref, setButtonEditorHref] = useState("");
  const [hasTextChanges, setHasTextChanges] = useState(false);
  const [footerDraft, setFooterDraft] = useState<FooterDraft | null>(null);
  const [footerEditorOpen, setFooterEditorOpen] = useState(false);
  const [footerTextInput, setFooterTextInput] = useState("");
  const [homeLayoutDraft, setHomeLayoutDraft] = useState<HomeLayoutDraft | null>(null);
  const [homeLayoutEditorOpen, setHomeLayoutEditorOpen] = useState(false);
  const [homeSkillsDraft, setHomeSkillsDraft] = useState<string[] | null>(null);
  const [homeSkillsEditorOpen, setHomeSkillsEditorOpen] = useState(false);
  const [homeLayoutDirty, setHomeLayoutDirty] = useState(false);
  const [homeSkillsDirty, setHomeSkillsDirty] = useState(false);
  const [contactLayoutDraft, setContactLayoutDraft] = useState<ContactLayoutDraft | null>(null);
  const [contactLayoutEditorOpen, setContactLayoutEditorOpen] = useState(false);
  const [contactLayoutDirty, setContactLayoutDirty] = useState(false);
  const [aboutLayoutDraft, setAboutLayoutDraft] = useState<AboutLayoutDraft | null>(null);
  const [aboutLayoutEditorOpen, setAboutLayoutEditorOpen] = useState(false);
  const [aboutLayoutDirty, setAboutLayoutDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<LocalEditorVersion[]>([]);
  const [serverHistoryItems, setServerHistoryItems] = useState<ServerEditorRevision[]>([]);
  const [serverHistoryLoading, setServerHistoryLoading] = useState(false);
  const [recoverableDraft, setRecoverableDraft] = useState<RecoverableLocalDraft | null>(null);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const initialTextSnapshotRef = useRef<string>("");
  const lastVersionSnapshotAtRef = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textBindings = useMemo(() => getTextBindings(slug), [slug]);
  const exitHref = slug === "home" ? "/" : slug === "blog" ? "/blog" : `/${slug}`;
  const hasPendingChanges =
    hasTextChanges ||
    Object.keys(buttonDrafts).length > 0 ||
    Object.keys(logoDrafts).length > 0 ||
    !!footerDraft ||
    !!siteDraft ||
    homeLayoutDirty ||
    homeSkillsDirty ||
    contactLayoutDirty ||
    aboutLayoutDirty;

  const closeExpandablePanels = useCallback(() => {
    setSiteEditorOpen(false);
    setButtonEditorOpen(false);
    setFooterEditorOpen(false);
    setLogoEditorOpen(false);
    setHomeLayoutEditorOpen(false);
    setHomeSkillsEditorOpen(false);
    setContactLayoutEditorOpen(false);
    setAboutLayoutEditorOpen(false);
    setHistoryOpen(false);
  }, []);

  useEffect(() => {
    if (slug === "blog") return;
    const cleanup: Array<() => void> = [];

    if (slug === "about") {
      const editableEls = Array.from(
        document.querySelectorAll<HTMLElement>("main [data-about-edit]")
      );
      for (const el of editableEls) {
        const key = el.getAttribute("data-about-edit");
        if (!key) continue;
        el.contentEditable = "true";
        el.setAttribute("data-editor-key", key);
        el.classList.add(...EDITABLE_CLASS.split(" "));
        cleanup.push(() => {
          el.contentEditable = "false";
          el.classList.remove(...EDITABLE_CLASS.split(" "));
        });
      }
    } else {
      const inlineEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-inline-field^="${slug}."]`));
      if (inlineEls.length > 0) {
        for (const el of inlineEls) {
          const key = el.getAttribute("data-inline-field");
          if (!key) continue;
          el.contentEditable = "true";
          el.setAttribute("data-editor-key", key);
          el.classList.add(...EDITABLE_CLASS.split(" "));
          cleanup.push(() => {
            el.contentEditable = "false";
            el.classList.remove(...EDITABLE_CLASS.split(" "));
          });
        }
      } else {
        for (const binding of textBindings) {
          const el = document.querySelector(binding.selector);
          if (!el || !(el instanceof HTMLElement)) continue;
          el.contentEditable = "true";
          el.setAttribute("data-editor-key", binding.key);
          el.classList.add(...EDITABLE_CLASS.split(" "));
          cleanup.push(() => {
            el.contentEditable = "false";
            el.classList.remove(...EDITABLE_CLASS.split(" "));
          });
        }
      }
    }

    const imgs = Array.from(
      document.querySelectorAll<HTMLImageElement>("main img:not([data-about-profile-img]):not([data-about-logo-img])")
    );
    for (const img of imgs) {
      img.classList.add(...EDITABLE_CLASS.split(" "));
      const onClick = () => {
        setSelectedImage(img);
        setMediaOpen(true);
      };
      img.addEventListener("click", onClick);
      cleanup.push(() => {
        img.classList.remove(...EDITABLE_CLASS.split(" "));
        img.removeEventListener("click", onClick);
      });
    }

    if (slug === "about") {
      const profileTargets = Array.from(document.querySelectorAll<HTMLElement>("main [data-about-profile-image]"));
      for (const target of profileTargets) {
        target.classList.add(...EDITABLE_LOGO_CLASS.split(" "));
        const onClick = () => {
          const img = target.querySelector<HTMLImageElement>("[data-about-profile-img]");
          if (!img) return;
          setSelectedImage(img);
          setMediaOpen(true);
        };
        target.addEventListener("click", onClick);
        cleanup.push(() => {
          target.classList.remove(...EDITABLE_LOGO_CLASS.split(" "));
          target.removeEventListener("click", onClick);
        });
      }

      const logoTargets = Array.from(document.querySelectorAll<HTMLElement>("main [data-about-logo-key]"));
      for (const target of logoTargets) {
        const key = target.getAttribute("data-about-logo-key");
        if (!key) continue;
        if (target.hasAttribute("data-about-logo-empty")) {
          target.classList.remove("hidden");
          target.classList.add("flex");
          cleanup.push(() => {
            target.classList.remove("flex");
            target.classList.add("hidden");
          });
        }
        target.classList.add(...EDITABLE_CLASS.split(" "));
        const onClick = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          setLogoEditorKey(key);
          closeExpandablePanels();
          setLogoEditorOpen(true);
        };
        target.addEventListener("click", onClick);
        cleanup.push(() => {
          target.classList.remove(...EDITABLE_CLASS.split(" "));
          target.removeEventListener("click", onClick);
        });
      }

      const updateAboutAddControlVisibility = (blockGroup: string) => {
        const sectionNodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            `main [data-about-block-root][data-about-block-group="${blockGroup}"]`
          )
        );
        for (let i = 0; i < sectionNodes.length; i += 1) {
          const addBtn = sectionNodes[i].querySelector<HTMLElement>("[data-about-add-control]");
          if (!addBtn) continue;
          addBtn.style.display = i === sectionNodes.length - 1 ? "" : "none";
        }
      };

      const applyAboutBlockLockState = (blockNode: HTMLElement) => {
        const locked = blockNode.getAttribute("data-about-block-locked") === "true";
        const editableNodes = Array.from(blockNode.querySelectorAll<HTMLElement>("[data-about-edit]"));
        for (const editableNode of editableNodes) {
          editableNode.contentEditable = locked ? "false" : "true";
          editableNode.classList.toggle("opacity-70", locked);
        }
        const logoNodes = Array.from(blockNode.querySelectorAll<HTMLElement>("[data-about-logo-key]"));
        for (const logoNode of logoNodes) {
          logoNode.classList.toggle("opacity-70", locked);
        }
        blockNode.classList.toggle("ring-1", locked);
        blockNode.classList.toggle("ring-amber-300", locked);
      };

      const attachBlockControls = (blockNode: HTMLElement, section: AboutBlockSection) => {
        if (blockNode.querySelector("[data-about-block-controls]")) return;
        const blockGroup = blockNode.getAttribute("data-about-block-group") ?? section;
        const controls = document.createElement("div");
        controls.setAttribute("data-about-block-controls", "");
        controls.className = "mt-2 flex flex-wrap items-center justify-end gap-1";
        const createControlButton = (icon: string, title: string, onClick: () => void, variant: "default" | "danger" = "default") => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = icon;
          btn.title = title;
          btn.setAttribute("aria-label", title);
          btn.className =
            variant === "danger"
              ? "inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-[var(--background)] text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
              : "inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--background)] text-[11px] font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]";
          const handler = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
          };
          btn.addEventListener("click", handler);
          cleanup.push(() => btn.removeEventListener("click", handler));
          return btn;
        };
        controls.appendChild(
          createControlButton("↑", "Move block up", () => {
            if (blockNode.getAttribute("data-about-block-locked") === "true") {
              setStatus("Block is locked. Unlock it first.");
              return;
            }
            const prev = blockNode.previousElementSibling as HTMLElement | null;
            if (!prev || prev.getAttribute("data-about-block-group") !== blockGroup) return;
            blockNode.parentElement?.insertBefore(blockNode, prev);
            renumberAboutSectionNodes(section, blockGroup);
            updateAboutAddControlVisibility(blockGroup);
            setHasTextChanges(true);
            setStatus("About block reordered. Click Save Changes.");
          })
        );
        controls.appendChild(
          createControlButton("↓", "Move block down", () => {
            if (blockNode.getAttribute("data-about-block-locked") === "true") {
              setStatus("Block is locked. Unlock it first.");
              return;
            }
            const next = blockNode.nextElementSibling as HTMLElement | null;
            if (!next || next.getAttribute("data-about-block-group") !== blockGroup) return;
            blockNode.parentElement?.insertBefore(next, blockNode);
            renumberAboutSectionNodes(section, blockGroup);
            updateAboutAddControlVisibility(blockGroup);
            setHasTextChanges(true);
            setStatus("About block reordered. Click Save Changes.");
          })
        );
        const addBtn = createControlButton("+", "Add block below", () => {
          if (blockNode.getAttribute("data-about-block-locked") === "true") {
            setStatus("Block is locked. Unlock it first.");
            return;
          }
          const clone = blockNode.cloneNode(true) as HTMLElement;
          normalizeAboutBlockClone(clone);
          blockNode.parentElement?.insertBefore(clone, blockNode.nextSibling);
          renumberAboutSectionNodes(section, blockGroup);
          attachBlockEnhancements(clone);
          updateAboutAddControlVisibility(blockGroup);
          setHasTextChanges(true);
          setStatus("New about block added. Click Save Changes.");
        });
        addBtn.setAttribute("data-about-add-control", "");
        controls.appendChild(addBtn);
        controls.appendChild(
          createControlButton("⧉", "Duplicate block", () => {
            if (blockNode.getAttribute("data-about-block-locked") === "true") {
              setStatus("Block is locked. Unlock it first.");
              return;
            }
            const clone = blockNode.cloneNode(true) as HTMLElement;
            const existingControls = clone.querySelector("[data-about-block-controls]");
            if (existingControls) existingControls.remove();
            blockNode.parentElement?.insertBefore(clone, blockNode.nextSibling);
            renumberAboutSectionNodes(section, blockGroup);
            attachBlockEnhancements(clone);
            updateAboutAddControlVisibility(blockGroup);
            setHasTextChanges(true);
            setStatus("About block duplicated. Click Save Changes.");
          })
        );
        controls.appendChild(
          createControlButton("🔒", "Lock or unlock block", () => {
            const locked = blockNode.getAttribute("data-about-block-locked") === "true";
            if (locked) blockNode.removeAttribute("data-about-block-locked");
            else blockNode.setAttribute("data-about-block-locked", "true");
            applyAboutBlockLockState(blockNode);
            const lockBtn = blockNode.querySelector<HTMLButtonElement>('[aria-label="Lock or unlock block"]');
            if (lockBtn) lockBtn.textContent = locked ? "🔒" : "🔓";
            setHasTextChanges(true);
            setStatus(locked ? "Block unlocked. Click Publish." : "Block locked. Click Publish.");
          })
        );
        controls.appendChild(
          createControlButton("✕", "Delete block", () => {
            if (blockNode.getAttribute("data-about-block-locked") === "true") {
              setStatus("Block is locked. Unlock it first.");
              return;
            }
            const siblings = Array.from(
              document.querySelectorAll<HTMLElement>(
                `main [data-about-block-root][data-about-block-group="${blockGroup}"]`
              )
            );
            if (siblings.length <= 1) {
              setStatus("Keep at least one block in this section.");
              return;
            }
            const ok = window.confirm("Delete this block?");
            if (!ok) return;
            blockNode.remove();
            renumberAboutSectionNodes(section, blockGroup);
            updateAboutAddControlVisibility(blockGroup);
            setHasTextChanges(true);
            setStatus("About block deleted. Click Save Changes.");
          }, "danger")
        );
        blockNode.appendChild(controls);
        cleanup.push(() => controls.remove());
      };

      const attachBlockEnhancements = (blockNode: HTMLElement) => {
        const editableNodes = Array.from(blockNode.querySelectorAll<HTMLElement>("[data-about-edit]"));
        for (const editableNode of editableNodes) {
          const key = editableNode.getAttribute("data-about-edit");
          if (!key) continue;
          editableNode.contentEditable = "true";
          editableNode.setAttribute("data-editor-key", key);
          editableNode.classList.add(...EDITABLE_CLASS.split(" "));
          cleanup.push(() => {
            editableNode.contentEditable = "false";
            editableNode.classList.remove(...EDITABLE_CLASS.split(" "));
          });
        }
        const blockLogoTargets = Array.from(blockNode.querySelectorAll<HTMLElement>("[data-about-logo-key]"));
        for (const blockLogoTarget of blockLogoTargets) {
          const key = blockLogoTarget.getAttribute("data-about-logo-key");
          if (!key) continue;
          if (blockLogoTarget.hasAttribute("data-about-logo-empty")) {
            blockLogoTarget.classList.remove("hidden");
            blockLogoTarget.classList.add("flex");
          }
          blockLogoTarget.classList.add(...EDITABLE_CLASS.split(" "));
          const onLogoClick = (event: Event) => {
            if (blockNode.getAttribute("data-about-block-locked") === "true") return;
            event.preventDefault();
            event.stopPropagation();
            setLogoEditorKey(key);
            closeExpandablePanels();
            setLogoEditorOpen(true);
          };
          blockLogoTarget.addEventListener("click", onLogoClick);
          cleanup.push(() => {
            blockLogoTarget.classList.remove(...EDITABLE_CLASS.split(" "));
            blockLogoTarget.removeEventListener("click", onLogoClick);
          });
        }
        const sectionAttr = blockNode.getAttribute("data-about-block-section");
        if (sectionAttr === "education" || sectionAttr === "experience" || sectionAttr === "volunteer" || sectionAttr === "project" || sectionAttr === "custom") {
          attachBlockControls(blockNode, sectionAttr as AboutBlockSection);
        }
        applyAboutBlockLockState(blockNode);
      };

      const blockRoots = Array.from(
        document.querySelectorAll<HTMLElement>("main [data-about-block-root][data-about-block-section]")
      );
      for (const blockRoot of blockRoots) {
        const sectionAttr = blockRoot.getAttribute("data-about-block-section");
        if (sectionAttr !== "education" && sectionAttr !== "experience" && sectionAttr !== "volunteer" && sectionAttr !== "project" && sectionAttr !== "custom") continue;
        attachBlockEnhancements(blockRoot);
      }
      updateAboutAddControlVisibility("education");
      updateAboutAddControlVisibility("experience");
      updateAboutAddControlVisibility("volunteer");
      updateAboutAddControlVisibility("projects");
      const customSectionNodes = Array.from(
        document.querySelectorAll<HTMLElement>('main [data-about-content] > [data-about-section^="custom:"]')
      );
      for (const sectionNode of customSectionNodes) {
        const sectionId = sectionNode.getAttribute("data-about-section");
        if (!sectionId) continue;
        updateAboutAddControlVisibility(sectionId);
      }
    }

    return () => {
      for (const fn of cleanup) fn();
    };
  // normalizeAboutBlockClone and renumberAboutSectionNodes are defined later in this file.
  // Keep this dependency list stable to avoid TDZ access during render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeExpandablePanels, slug, textBindings]);

  const getButtonLabel = (node: Element): string => {
    const labelNode = node.querySelector<HTMLElement>("[data-editor-button-label]");
    if (labelNode) return (labelNode.textContent ?? "").trim();
    return (node.textContent ?? "").trim();
  };

  const normalizeHrefForKey = (key: string, href: string): string => {
    const trimmed = href.trim();
    if (!trimmed) return trimmed;
    if ((key === "contact.email" || key === "footer.email") && !trimmed.startsWith("mailto:") && trimmed.includes("@")) {
      return `mailto:${trimmed}`;
    }
    return trimmed;
  };

  const applyButtonDraftToDom = useCallback((key: string, draft: ButtonDraft) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-editor-button="${key}"]`));
    for (const node of nodes) {
      if (node instanceof HTMLAnchorElement && draft.href.trim()) {
        node.setAttribute("href", draft.href.trim());
      }
      const labelNode = node.querySelector<HTMLElement>("[data-editor-button-label]");
      if (labelNode && draft.label.trim()) {
        labelNode.textContent = draft.label.trim();
      }
    }
  }, []);

  const applySiteDraftToDom = useCallback((draft: SiteDraft) => {
    const labels = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-site-label]"));
    for (const node of labels) {
      node.textContent = draft.siteName.trim() || node.textContent || "";
    }
    const authors = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-author-name]"));
    for (const node of authors) {
      node.textContent = draft.authorName.trim() || draft.siteName.trim() || node.textContent || "";
    }
    const logos = Array.from(document.querySelectorAll<HTMLImageElement>("[data-editor-site-logo]"));
    for (const logo of logos) {
      if (!draft.logoUrl.trim()) continue;
      logo.setAttribute("src", draft.logoUrl.trim());
    }
  }, []);

  const applyLogoDraftToDom = useCallback((key: string, url: string) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-about-logo-key="${key}"]`));
    for (const node of nodes) {
      const existingImg = node.querySelector<HTMLImageElement>("[data-about-logo-img]");
      if (url.trim()) {
        if (existingImg) {
          existingImg.setAttribute("src", url.trim());
        } else {
          node.textContent = "";
          const img = document.createElement("img");
          img.setAttribute("src", url.trim());
          img.setAttribute("alt", "");
          img.setAttribute("data-about-logo-img", "");
          img.className = "h-full w-full object-contain";
          node.appendChild(img);
        }
        node.classList.remove("hidden");
        node.classList.add("flex");
        node.removeAttribute("data-about-logo-empty");
      } else {
        if (existingImg) existingImg.remove();
        node.setAttribute("data-about-logo-empty", "");
        node.textContent = "+ Logo";
        node.classList.remove("hidden");
        node.classList.add("flex");
      }
    }
  }, []);

  const applyFooterDraftToDom = useCallback((draft: FooterDraft) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-footer-text]"));
    for (const node of nodes) {
      node.textContent = draft.footerText;
    }
  }, []);

  const readHomeSkillsFromDom = useCallback((): string[] => {
    const skillNodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-inline-field^="home.skills."]')
    );
    const keyed = skillNodes
      .map((node) => {
        const key = node.getAttribute("data-inline-field") ?? "";
        const index = Number(key.replace("home.skills.", ""));
        return { node, index };
      })
      .filter((item) => Number.isFinite(item.index))
      .sort((a, b) => a.index - b.index);
    return keyed.map((item) => (item.node.textContent ?? "").trim()).filter(Boolean);
  }, []);

  const applyHomeSkillsDraftToDom = useCallback((skills: string[]) => {
    const skillNodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-inline-field^="home.skills."]')
    );
    if (skillNodes.length === 0) return;
    const keyed = skillNodes
      .map((node) => {
        const key = node.getAttribute("data-inline-field") ?? "";
        const index = Number(key.replace("home.skills.", ""));
        return { node, index };
      })
      .filter((item) => Number.isFinite(item.index))
      .sort((a, b) => a.index - b.index);
    const firstBadge = keyed[0]?.node.closest("span");
    if (!firstBadge) return;
    const container = firstBadge.parentElement;
    if (!container) return;
    const desired = skills.length > 0 ? skills : ["New skill"];
    while (keyed.length < desired.length) {
      const clone = firstBadge.cloneNode(true) as HTMLElement;
      const span = clone.querySelector<HTMLElement>('[data-inline-field^="home.skills."]');
      if (!span) break;
      container.appendChild(clone);
      keyed.push({ node: span, index: keyed.length });
      span.contentEditable = "true";
      span.classList.add(...EDITABLE_CLASS.split(" "));
    }
    for (let i = 0; i < keyed.length; i += 1) {
      const item = keyed[i];
      const badge = item.node.closest("span");
      if (!badge) continue;
      if (i < desired.length) {
        item.node.setAttribute("data-inline-field", `home.skills.${i}`);
        item.node.textContent = desired[i];
        badge.classList.remove("hidden");
      } else {
        badge.remove();
      }
    }
  }, []);

  const readHomeLayoutFromDom = useCallback((): HomeLayoutDraft => {
    const ids: HomeSection[] = ["hero", "latestPosts", "skills"];
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-home-section]"));
    const inOrder = sections
      .map((section) => section.getAttribute("data-home-section"))
      .filter((id): id is HomeSection => id === "hero" || id === "latestPosts" || id === "skills");
    const remaining = ids.filter((id) => !inOrder.includes(id));
    const visibility = {
      hero: true,
      latestPosts: true,
      skills: true,
    } as Record<HomeSection, boolean>;
    for (const id of ids) {
      const node = document.querySelector<HTMLElement>(`main [data-home-section="${id}"]`);
      if (node) visibility[id] = node.style.display !== "none";
    }
    return { sectionOrder: [...inOrder, ...remaining], sectionVisibility: visibility };
  }, []);

  const applyHomeLayoutDraftToDom = useCallback((draft: HomeLayoutDraft) => {
    const parent = document.querySelector<HTMLElement>("main > div");
    if (!parent) return;
    for (const id of draft.sectionOrder) {
      const node = parent.querySelector<HTMLElement>(`[data-home-section="${id}"]`);
      if (!node) continue;
      parent.appendChild(node);
      node.style.display = draft.sectionVisibility[id] ? "" : "none";
    }
  }, []);

  const readContactLayoutFromDom = useCallback((): ContactLayoutDraft => {
    const ids: ContactButtonKey[] = ["email", "linkedin", "github"];
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("main [data-contact-button]"));
    const order = nodes
      .map((node) => node.getAttribute("data-contact-button"))
      .filter((id): id is ContactButtonKey => id === "email" || id === "linkedin" || id === "github");
    const missing = ids.filter((id) => !order.includes(id));
    const visibility: Record<ContactButtonKey, boolean> = { email: true, linkedin: true, github: true };
    for (const id of ids) {
      const node = document.querySelector<HTMLElement>(`main [data-contact-button="${id}"]`);
      visibility[id] = !!node && node.style.display !== "none";
    }
    return { buttonOrder: [...order, ...missing], buttonVisibility: visibility };
  }, []);

  const applyContactLayoutDraftToDom = useCallback((draft: ContactLayoutDraft) => {
    const container = document.querySelector<HTMLElement>("main [data-contact-buttons-container]");
    if (!container) return;
    for (const id of draft.buttonOrder) {
      const node = container.querySelector<HTMLElement>(`[data-contact-button="${id}"]`);
      if (!node) continue;
      container.appendChild(node);
      node.style.display = draft.buttonVisibility[id] ? "" : "none";
    }
  }, []);

  const readAboutLayoutFromDom = useCallback((): AboutLayoutDraft => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('main [data-about-content] > [data-about-section]'));
    const order = nodes
      .map((node) => node.getAttribute("data-about-section"))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const baseIds = ["education", "experience", "volunteer", "projects", "skills", "achievements"];
    const missing = baseIds.filter((id) => !order.includes(id));
    const allIds = [...order, ...missing];
    const visibility: Record<string, boolean> = {};
    for (const id of allIds) {
      const node = document.querySelector<HTMLElement>(`main [data-about-content] > [data-about-section="${id}"]`);
      visibility[id] = !!node && node.style.display !== "none";
    }
    return { sectionOrder: allIds, sectionVisibility: visibility };
  }, []);

  const applyAboutLayoutDraftToDom = useCallback((draft: AboutLayoutDraft) => {
    const container = document.querySelector<HTMLElement>("main [data-about-content]");
    if (!container) return;
    for (const id of draft.sectionOrder) {
      const node = container.querySelector<HTMLElement>(`:scope > [data-about-section="${id}"]`);
      if (!node) continue;
      container.appendChild(node);
      node.style.display = draft.sectionVisibility[id] ? "" : "none";
    }
  }, []);

  const renumberAboutSectionNodes = useCallback((section: AboutBlockSection, blockGroup: string) => {
    const firstNode = document.querySelector<HTMLElement>(
      `main [data-about-block-root][data-about-block-section="${section}"][data-about-block-group="${blockGroup}"]`
    );
    const prefix =
      section === "custom"
        ? firstNode?.getAttribute("data-about-block-prefix") ?? ""
        : ABOUT_BLOCK_SECTION_PREFIX[section];
    if (!prefix) return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        `main [data-about-block-root][data-about-block-section="${section}"][data-about-block-group="${blockGroup}"]`
      )
    );
    const keyPattern = new RegExp(`^${escapeRegExp(prefix)}\\.\\d+\\.`);
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      node.setAttribute("data-about-block-index", String(i));
      const editNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-about-edit]"));
      for (const editNode of editNodes) {
        const key = editNode.getAttribute("data-about-edit");
        if (!key || !keyPattern.test(key)) continue;
        editNode.setAttribute("data-about-edit", key.replace(keyPattern, `${prefix}.${i}.`));
      }
      const logoNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-about-logo-key]"));
      for (const logoNode of logoNodes) {
        const key = logoNode.getAttribute("data-about-logo-key");
        if (!key || !keyPattern.test(key)) continue;
        logoNode.setAttribute("data-about-logo-key", key.replace(keyPattern, `${prefix}.${i}.`));
      }
    }
  }, []);

  const normalizeAboutBlockClone = useCallback((node: HTMLElement) => {
    const existingControls = node.querySelector("[data-about-block-controls]");
    if (existingControls) existingControls.remove();
    const editNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-about-edit]"));
    for (const editNode of editNodes) {
      const key = editNode.getAttribute("data-about-edit") ?? "";
      if (key.endsWith(".title")) editNode.textContent = "New title";
      else if (key.endsWith(".organization")) editNode.textContent = "New organization";
      else if (key.endsWith(".dateRange")) editNode.textContent = "Date range";
      else if (key.endsWith(".content")) editNode.textContent = "New bullet";
    }
    const logoNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-about-logo-key]"));
    for (const logoNode of logoNodes) {
      const img = logoNode.querySelector<HTMLImageElement>("[data-about-logo-img]");
      if (img) img.remove();
      logoNode.setAttribute("data-about-logo-empty", "");
      logoNode.textContent = "+ Logo";
      logoNode.classList.remove("hidden");
      logoNode.classList.add("flex");
    }
  }, []);

  useEffect(() => {
    if (slug === "blog") return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-button]"));
    const cleanup: Array<() => void> = [];
    for (const node of nodes) {
      node.classList.add(...EDITABLE_BUTTON_CLASS.split(" "));
      const onClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = node.getAttribute("data-editor-button");
        if (!key) return;
        const currentHref = node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : "";
        const draft = buttonDrafts[key];
        setButtonEditorTarget(key);
        setButtonEditorLabel((draft?.label ?? getButtonLabel(node)).trim());
        setButtonEditorHref((draft?.href ?? currentHref).trim());
        closeExpandablePanels();
        setButtonEditorOpen(true);
      };
      node.addEventListener("click", onClick);
      cleanup.push(() => {
        node.classList.remove(...EDITABLE_BUTTON_CLASS.split(" "));
        node.removeEventListener("click", onClick);
      });
    }
    return () => {
      for (const fn of cleanup) fn();
    };
  }, [buttonDrafts, closeExpandablePanels, slug]);

  useEffect(() => {
    if (slug === "blog") return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-site]"));
    const cleanup: Array<() => void> = [];
    for (const node of nodes) {
      node.classList.add(...EDITABLE_CLASS.split(" "));
      const onClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const labelNode = node.querySelector<HTMLElement>("[data-editor-site-label]");
        const authorNode = node.querySelector<HTMLElement>("[data-editor-author-name]");
        const logoNode = node.querySelector<HTMLImageElement>("[data-editor-site-logo]");
        const currentDraft = siteDraft ?? {
          siteName: (labelNode?.textContent ?? "").trim(),
          authorName: (authorNode?.textContent ?? labelNode?.textContent ?? "").trim(),
          logoUrl: (logoNode?.getAttribute("src") ?? "").trim(),
        };
        setSiteNameInput(currentDraft.siteName);
        setAuthorNameInput(currentDraft.authorName || currentDraft.siteName);
        setSiteLogoInput(currentDraft.logoUrl);
        closeExpandablePanels();
        setSiteEditorOpen(true);
      };
      node.addEventListener("click", onClick);
      cleanup.push(() => {
        node.classList.remove(...EDITABLE_CLASS.split(" "));
        node.removeEventListener("click", onClick);
      });
    }
    return () => {
      for (const fn of cleanup) fn();
    };
  }, [closeExpandablePanels, siteDraft, slug]);

  useEffect(() => {
    if (slug === "blog") return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-footer-text]"));
    const cleanup: Array<() => void> = [];
    for (const node of nodes) {
      const onClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setFooterTextInput((footerDraft?.footerText ?? node.textContent ?? "").trim());
        closeExpandablePanels();
        setFooterEditorOpen(true);
      };
      node.classList.add(...EDITABLE_CLASS.split(" "));
      node.addEventListener("click", onClick);
      cleanup.push(() => {
        node.classList.remove(...EDITABLE_CLASS.split(" "));
        node.removeEventListener("click", onClick);
      });
    }
    return () => {
      for (const fn of cleanup) fn();
    };
  }, [closeExpandablePanels, footerDraft, slug]);

  useEffect(() => {
    if (slug !== "home") return;
    const timeout = window.setTimeout(() => {
      setHomeLayoutDraft(readHomeLayoutFromDom());
      setHomeSkillsDraft(readHomeSkillsFromDom());
      setHomeLayoutDirty(false);
      setHomeSkillsDirty(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [readHomeLayoutFromDom, readHomeSkillsFromDom, slug]);

  useEffect(() => {
    if (slug !== "contact") return;
    const timeout = window.setTimeout(() => {
      setContactLayoutDraft(readContactLayoutFromDom());
      setContactLayoutDirty(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [readContactLayoutFromDom, slug]);

  useEffect(() => {
    if (slug !== "about") return;
    const timeout = window.setTimeout(() => {
      setAboutLayoutDraft(readAboutLayoutFromDom());
      setAboutLayoutDirty(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [readAboutLayoutFromDom, slug]);

  const collectText = useCallback(() => {
    const out: Record<string, unknown> = {};
    if (slug === "about") {
      const aboutOut: Record<string, unknown> = {};
      const editableEls = Array.from(
        document.querySelectorAll<HTMLElement>("main [data-about-edit]")
      );
      for (const el of editableEls) {
        const key = el.getAttribute("data-about-edit");
        if (!key) continue;
        const value = key.endsWith(".content")
          ? (el.innerText ?? el.textContent ?? "").trim()
          : (el.textContent ?? "").trim();
        setDeepValue(aboutOut, key, value);
      }
      return aboutOut;
    }
    const inlineEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-inline-field^="${slug}."]`));
    if (inlineEls.length > 0) {
      for (const el of inlineEls) {
        const key = el.getAttribute("data-inline-field");
        if (!key) continue;
        setDeepValue(out, key.replace(`${slug}.`, ""), (el.textContent ?? "").trim());
      }
      return out;
    }
    for (const binding of textBindings) {
      const el = document.querySelector(binding.selector);
      if (!el) continue;
      setDeepValue(out, binding.key, (el.textContent ?? "").trim());
    }
    return out;
  }, [slug, textBindings]);

  const snapshotText = useCallback(() => JSON.stringify(collectText()), [collectText]);
  const getDraftStorageKey = useCallback(
    () => `${LOCAL_DRAFT_PREFIX}:${slug}`,
    [slug]
  );
  const getVersionHistoryStorageKey = useCallback(
    () => `${LOCAL_DRAFT_PREFIX}:history:${slug}`,
    [slug]
  );

  const readVersionHistory = useCallback((): LocalEditorVersion[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(getVersionHistoryStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LocalEditorVersion[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && typeof item === "object" && item.id && item.savedAt && item.draft);
    } catch {
      return [];
    }
  }, [getVersionHistoryStorageKey]);

  const applyRecoveredText = useCallback(
    (text: Record<string, unknown>) => {
      if (!text || typeof text !== "object") return;
      if (slug === "about") {
        const editableEls = Array.from(document.querySelectorAll<HTMLElement>("main [data-about-edit]"));
        for (const el of editableEls) {
          const key = el.getAttribute("data-about-edit");
          if (!key) continue;
          const value = getDeepValue(text, key);
          if (typeof value === "string") el.textContent = value;
        }
        return;
      }
      const inlineEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-inline-field^="${slug}."]`));
      if (inlineEls.length > 0) {
        for (const el of inlineEls) {
          const key = el.getAttribute("data-inline-field");
          if (!key) continue;
          const value = getDeepValue(text, key.replace(`${slug}.`, ""));
          if (typeof value === "string") el.textContent = value;
        }
        return;
      }
      for (const binding of textBindings) {
        const node = document.querySelector<HTMLElement>(binding.selector);
        if (!node) continue;
        const value = getDeepValue(text, binding.key);
        if (typeof value === "string") node.textContent = value;
      }
    },
    [slug, textBindings]
  );

  const restoreFromLocalDraft = useCallback(
    (parsed: LocalEditorDraft, sourceLabel: string) => {
      if (!parsed || parsed.version !== 1 || parsed.slug !== slug) return;
      applyRecoveredText(parsed.text ?? {});
      if (parsed.buttonDrafts) {
        setButtonDrafts(parsed.buttonDrafts);
        for (const [key, draft] of Object.entries(parsed.buttonDrafts)) {
          applyButtonDraftToDom(key, draft);
        }
      }
      if (parsed.logoDrafts) {
        setLogoDrafts(parsed.logoDrafts);
        for (const [key, url] of Object.entries(parsed.logoDrafts)) {
          applyLogoDraftToDom(key, url);
        }
      }
      if (parsed.siteDraft) {
        setSiteDraft(parsed.siteDraft);
        applySiteDraftToDom(parsed.siteDraft);
      }
      if (parsed.footerDraft) {
        setFooterDraft(parsed.footerDraft);
        applyFooterDraftToDom(parsed.footerDraft);
      }
      if (slug === "home") {
        if (parsed.homeLayoutDraft) {
          setHomeLayoutDraft(parsed.homeLayoutDraft);
          applyHomeLayoutDraftToDom(parsed.homeLayoutDraft);
          setHomeLayoutDirty(true);
        }
        if (parsed.homeSkillsDraft) {
          setHomeSkillsDraft(parsed.homeSkillsDraft);
          applyHomeSkillsDraftToDom(parsed.homeSkillsDraft);
          setHomeSkillsDirty(true);
        }
      }
      if (slug === "contact" && parsed.contactLayoutDraft) {
        setContactLayoutDraft(parsed.contactLayoutDraft);
        applyContactLayoutDraftToDom(parsed.contactLayoutDraft);
        setContactLayoutDirty(true);
      }
      if (slug === "about" && parsed.aboutLayoutDraft) {
        setAboutLayoutDraft(parsed.aboutLayoutDraft);
        applyAboutLayoutDraftToDom(parsed.aboutLayoutDraft);
        setAboutLayoutDirty(true);
      }
      window.setTimeout(() => {
        setHasTextChanges(snapshotText() !== initialTextSnapshotRef.current);
        setStatus(`Recovered ${sourceLabel}. Click Publish to apply.`);
      }, 0);
    },
    [
      applyAboutLayoutDraftToDom,
      applyButtonDraftToDom,
      applyContactLayoutDraftToDom,
      applyFooterDraftToDom,
      applyHomeLayoutDraftToDom,
      applyHomeSkillsDraftToDom,
      applyLogoDraftToDom,
      applyRecoveredText,
      applySiteDraftToDom,
      slug,
      snapshotText,
    ]
  );

  const buildCurrentDraftPayload = useCallback((): LocalEditorDraft => {
    return {
      version: 1,
      savedAt: Date.now(),
      slug,
      text: collectText() as Record<string, unknown>,
      buttonDrafts,
      logoDrafts,
      siteDraft,
      footerDraft,
      homeLayoutDraft,
      homeSkillsDraft,
      contactLayoutDraft,
      aboutLayoutDraft,
    };
  }, [
    aboutLayoutDraft,
    buttonDrafts,
    collectText,
    contactLayoutDraft,
    footerDraft,
    homeLayoutDraft,
    homeSkillsDraft,
    logoDrafts,
    siteDraft,
    slug,
  ]);

  const persistLocalDraft = useCallback((recordVersion: boolean) => {
    if (typeof window === "undefined") return;
    const payload = buildCurrentDraftPayload();
    window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(payload));
    setLastAutoSavedAt(payload.savedAt);
    const now = Date.now();
    if (!recordVersion && now - lastVersionSnapshotAtRef.current < 30000) return;
    lastVersionSnapshotAtRef.current = now;
    const nextVersion: LocalEditorVersion = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: now,
      draft: payload,
    };
    const versions = [nextVersion, ...readVersionHistory()].slice(0, LOCAL_VERSION_HISTORY_LIMIT);
    window.localStorage.setItem(getVersionHistoryStorageKey(), JSON.stringify(versions));
    setHistoryItems(versions);
  }, [
    buildCurrentDraftPayload,
    getDraftStorageKey,
    readVersionHistory,
    getVersionHistoryStorageKey,
  ]);

  const persistServerRevision = useCallback(
    async (mode: "draft" | "publish") => {
      const payload = buildCurrentDraftPayload();
      await fetch("/api/editor/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          mode,
          snapshot: payload,
        }),
      });
    },
    [buildCurrentDraftPayload, slug]
  );

  const loadServerHistory = useCallback(async () => {
    setServerHistoryLoading(true);
    try {
      const res = await fetch(`/api/editor/revisions?slug=${encodeURIComponent(slug)}&limit=30`, { cache: "no-store" });
      if (!res.ok) {
        setServerHistoryItems([]);
        return;
      }
      const list = (await res.json()) as ServerEditorRevision[];
      setServerHistoryItems(Array.isArray(list) ? list : []);
    } catch {
      setServerHistoryItems([]);
    } finally {
      setServerHistoryLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      initialTextSnapshotRef.current = snapshotText();
      setHasTextChanges(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [slug, snapshotText]);

  useEffect(() => {
    if (slug === "blog") return;
    const onInput = () => {
      setHasTextChanges(snapshotText() !== initialTextSnapshotRef.current);
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, [slug, snapshotText]);

  useEffect(() => {
    if (slug === "blog") return;
    if (typeof window === "undefined") return;
    setHistoryItems(readVersionHistory());
    void loadServerHistory();
    const raw = window.localStorage.getItem(getDraftStorageKey());
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LocalEditorDraft;
      if (!parsed || parsed.version !== 1 || parsed.slug !== slug) return;
      const stamp = new Date(parsed.savedAt).toLocaleString();
      setRecoverableDraft({
        label: `Recovered local draft from ${stamp}`,
        draft: parsed,
      });
    } catch {
      // Ignore invalid draft payload
    }
  }, [
    getDraftStorageKey,
    loadServerHistory,
    readVersionHistory,
    restoreFromLocalDraft,
    slug,
  ]);

  useEffect(() => {
    if (slug === "blog") return;
    if (!hasPendingChanges) return;
    const timer = window.setInterval(() => {
      persistLocalDraft(false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasPendingChanges, persistLocalDraft, slug]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasPendingChanges) persistLocalDraft(false);
      if (!hasPendingChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingChanges, persistLocalDraft]);

  const handleExit = useCallback(
    (event: React.MouseEvent) => {
      if (!hasPendingChanges) return;
      const ok = window.confirm("You have unsaved changes. Leave without saving?");
      if (!ok) event.preventDefault();
    },
    [hasPendingChanges]
  );

  const runUndo = useCallback(() => {
    const ok = document.execCommand("undo");
    if (!ok) {
      setStatus("Nothing to undo.");
      return;
    }
    window.setTimeout(() => {
      setHasTextChanges(snapshotText() !== initialTextSnapshotRef.current);
      setStatus("Undid last change.");
    }, 0);
  }, [snapshotText]);

  const runRedo = useCallback(() => {
    const ok = document.execCommand("redo");
    if (!ok) {
      setStatus("Nothing to redo.");
      return;
    }
    window.setTimeout(() => {
      setHasTextChanges(snapshotText() !== initialTextSnapshotRef.current);
      setStatus("Redid last change.");
    }, 0);
  }, [snapshotText]);

  const saveDraftNow = useCallback(async () => {
    persistLocalDraft(true);
    try {
      await persistServerRevision("draft");
      void loadServerHistory();
      setStatus("Draft saved (local + server).");
    } catch {
      setStatus("Draft saved locally. Server save failed.");
    }
  }, [loadServerHistory, persistLocalDraft, persistServerRevision]);

  useEffect(() => {
    if (slug === "blog") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Let About page sub-editors manage their own undo/redo stack.
      if (slug === "about") return;
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) return;
      const key = event.key.toLowerCase();
      const shouldRedo = key === "y" || (key === "z" && event.shiftKey);
      const shouldUndo = key === "z" && !event.shiftKey;
      if (!shouldRedo && !shouldUndo) return;
      event.preventDefault();
      if (shouldRedo) runRedo();
      else runUndo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runRedo, runUndo, slug]);

  const clampPanelPosition = useCallback((x: number, y: number) => {
    const margin = 8;
    const panelWidth = panelRef.current?.offsetWidth ?? 340;
    const panelHeight = panelRef.current?.offsetHeight ?? 140;
    const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  }, []);

  useEffect(() => {
    if (!panelPosition) return;
    const onResize = () => {
      setPanelPosition((current) => {
        if (!current) return current;
        return clampPanelPosition(current.x, current.y);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPanelPosition, panelPosition]);

  const startPanelDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      setIsDraggingPanel(true);
      const onMove = (moveEvent: PointerEvent) => {
        const next = clampPanelPosition(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
        setPanelPosition(next);
      };
      const onUp = () => {
        setIsDraggingPanel(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [clampPanelPosition]
  );

  const save = useCallback(
    async () => {
      setSaving(true);
      setStatus("");
      try {
        const text = collectText();
        if (slug === "home" || slug === "contact") {
          const existingRes = await fetch(`/api/site-content?page=${slug}`, { cache: "no-store" });
          const existing = existingRes.ok ? await existingRes.json() : {};
          const payload = {
            ...(existing ?? {}),
            ...text,
          };
          if (slug === "home") {
            const primary = buttonDrafts["home.ctaPrimary"];
            const secondary = buttonDrafts["home.ctaSecondary"];
            const contact = buttonDrafts["home.ctaContact"];
            if (primary) {
              payload.ctaPrimaryText = primary.label;
              payload.ctaPrimaryHref = primary.href;
            }
            if (secondary) {
              payload.ctaSecondaryText = secondary.label;
              payload.ctaSecondaryHref = secondary.href;
            }
            if (contact) {
              payload.ctaContactText = contact.label;
              payload.ctaContactHref = contact.href;
            }
            if (homeSkillsDraft && homeSkillsDraft.length > 0) {
              payload.skills = homeSkillsDraft;
            }
            if (homeLayoutDraft) {
              payload.sectionOrder = homeLayoutDraft.sectionOrder;
              payload.sectionVisibility = homeLayoutDraft.sectionVisibility;
            }
          }
          if (slug === "contact") {
            const emailBtn = buttonDrafts["contact.email"];
            const linkedinBtn = buttonDrafts["contact.linkedin"];
            const githubBtn = buttonDrafts["contact.github"];
            if (emailBtn) {
              payload.emailLabel = emailBtn.label;
              payload.email = emailBtn.href.replace(/^mailto:/i, "").trim();
            }
            if (linkedinBtn) {
              payload.linkedinLabel = linkedinBtn.label;
              payload.linkedin = linkedinBtn.href.trim();
            }
            if (githubBtn) {
              payload.githubLabel = githubBtn.label;
              payload.github = githubBtn.href.trim();
            }
            if (contactLayoutDraft) {
              payload.buttonOrder = contactLayoutDraft.buttonOrder;
              payload.buttonVisibility = contactLayoutDraft.buttonVisibility;
            }
          }
          const saveRes = await fetch("/api/site-content", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: slug, content: payload }),
          });
          if (!saveRes.ok) throw new Error("Failed to save page content");
        } else if (slug === "about") {
          const existingRes = await fetch("/api/about/config", { cache: "no-store" });
          const existing = existingRes.ok ? await existingRes.json() : {};
          const profileImage = document.querySelector("main [data-about-content] img")?.getAttribute("src") ?? existing.profileImage;
          const mergedEducationBlocks = mergeBlocksPreservingMeta(
            existing.educationBlocks,
            (text as { educationBlocks?: unknown }).educationBlocks
          );
          const mergedExperienceBlocks = mergeBlocksPreservingMeta(
            existing.experienceBlocks,
            (text as { experienceBlocks?: unknown }).experienceBlocks
          );
          const mergedVolunteerBlocks = mergeBlocksPreservingMeta(
            existing.volunteerBlocks,
            (text as { volunteerBlocks?: unknown }).volunteerBlocks
          );
          const mergedProjectBlocks = mergeBlocksPreservingMeta(
            existing.projectBlocks,
            (text as { projectBlocks?: unknown }).projectBlocks
          );
          const aboutPayload: Record<string, unknown> = {
            ...existing,
            ...text,
            educationBlocks: mergedEducationBlocks,
            experienceBlocks: mergedExperienceBlocks,
            volunteerBlocks: mergedVolunteerBlocks,
            projectBlocks: mergedProjectBlocks,
            profileImage,
            ...(aboutLayoutDraft
              ? {
                  sectionOrder: aboutLayoutDraft.sectionOrder,
                  sectionVisibility: aboutLayoutDraft.sectionVisibility,
                }
              : {}),
            ...(buttonDrafts["about.downloadCv"]
              ? {
                  heroPortfolioLabel: buttonDrafts["about.downloadCv"].label.trim(),
                  heroPortfolioUrl: buttonDrafts["about.downloadCv"].href.trim(),
                }
              : {}),
          };
          for (const [key, value] of Object.entries(logoDrafts)) {
            setDeepValue(aboutPayload, key, value);
          }
          const saveRes = await fetch("/api/about/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aboutPayload),
          });
          if (!saveRes.ok) throw new Error("Failed to save about content");
        }
        const footerEdits: Record<string, string> = {};
        if (buttonDrafts["footer.email"]) {
          footerEdits.email = buttonDrafts["footer.email"].href.replace(/^mailto:/i, "").trim();
        }
        if (buttonDrafts["footer.linkedin"]) {
          footerEdits.linkedin = buttonDrafts["footer.linkedin"].href.trim();
        }
        if (buttonDrafts["footer.github"]) {
          footerEdits.github = buttonDrafts["footer.github"].href.trim();
        }
        if (buttonDrafts["footer.rss"]) {
          footerEdits.rss = buttonDrafts["footer.rss"].href.trim();
        }
        if (Object.keys(footerEdits).length > 0) {
          const siteRes = await fetch("/api/site-config", { cache: "no-store" });
          const siteExisting = siteRes.ok ? await siteRes.json() : {};
          const links = {
            ...(siteExisting?.links ?? {}),
            ...footerEdits,
          };
          const siteSaveRes = await fetch("/api/site-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ links }),
          });
          if (!siteSaveRes.ok) throw new Error("Failed to save footer links");
        }
        if (siteDraft) {
          const siteSaveRes = await fetch("/api/site-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(siteDraft.siteName.trim() ? { siteName: siteDraft.siteName.trim() } : {}),
              authorName: siteDraft.authorName.trim() || null,
              ...(siteDraft.logoUrl.trim() ? { logoUrl: siteDraft.logoUrl.trim() } : {}),
            }),
          });
          if (!siteSaveRes.ok) throw new Error("Failed to save navbar brand");
        }
        if (footerDraft) {
          const siteSaveRes = await fetch("/api/site-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              footerText: footerDraft.footerText.trim() || null,
            }),
          });
          if (!siteSaveRes.ok) throw new Error("Failed to save footer text");
        }
        try {
          await persistServerRevision("publish");
          void loadServerHistory();
        } catch {
          // Keep publish success even if revision logging fails.
        }
        initialTextSnapshotRef.current = snapshotText();
        setHasTextChanges(false);
        setButtonDrafts({});
        setLogoDrafts({});
        setLogoEditorOpen(false);
        setLogoEditorKey("");
        setFooterDraft(null);
        setFooterEditorOpen(false);
        setSiteDraft(null);
        if (slug === "home") {
          const latestLayout = readHomeLayoutFromDom();
          const latestSkills = readHomeSkillsFromDom();
          setHomeLayoutDraft(latestLayout);
          setHomeSkillsDraft(latestSkills);
          setHomeLayoutDirty(false);
          setHomeSkillsDirty(false);
        }
        if (slug === "contact") {
          setContactLayoutDraft(readContactLayoutFromDom());
          setContactLayoutDirty(false);
        }
        if (slug === "about") {
          setAboutLayoutDraft(readAboutLayoutFromDom());
          setAboutLayoutDirty(false);
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(getDraftStorageKey());
        }
        setStatus("Saved to live site.");
      } catch {
        setStatus("Save failed. Check API/auth and try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      buttonDrafts,
      collectText,
      footerDraft,
      homeLayoutDraft,
      homeSkillsDraft,
      contactLayoutDraft,
      aboutLayoutDraft,
      loadServerHistory,
      logoDrafts,
      persistServerRevision,
      readAboutLayoutFromDom,
      readHomeLayoutFromDom,
      readHomeSkillsFromDom,
      readContactLayoutFromDom,
      getDraftStorageKey,
      siteDraft,
      slug,
      snapshotText,
    ]
  );

  const handleCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setStatus("Please upload a PDF file.");
      event.target.value = "";
      return;
    }
    setCvUploading(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/cv/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "CV upload failed");
      }
      setStatus("CV uploaded. Download CV now uses the new file.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CV upload failed");
    } finally {
      setCvUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed z-[100] max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-2.5 shadow-[var(--glass-shadow-hover)] backdrop-blur-xl ${isDraggingPanel ? "cursor-grabbing select-none" : ""}`}
      style={panelPosition ? { left: panelPosition.x, top: panelPosition.y } : { right: 16, bottom: 16 }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={startPanelDrag}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-grab active:cursor-grabbing touch-none"
          title="Drag panel"
          aria-label="Drag editor panel"
        >
          <Move className="h-4 w-4" />
        </button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={runUndo}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo last change"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={runRedo}
          title="Redo (Ctrl/Cmd+Y or Cmd+Shift+Z)"
          aria-label="Redo last change"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        {slug === "about" && (
          <input
            ref={cvInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => void handleCvUpload(event)}
          />
        )}
        {slug === "home" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                const draft = homeLayoutDraft ?? readHomeLayoutFromDom();
                setHomeLayoutDraft(draft);
                const nextOpen = !homeLayoutEditorOpen;
                closeExpandablePanels();
                setHomeLayoutEditorOpen(nextOpen);
              }}
            >
              Sections
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                const draft = homeSkillsDraft ?? readHomeSkillsFromDom();
                setHomeSkillsDraft(draft);
                const nextOpen = !homeSkillsEditorOpen;
                closeExpandablePanels();
                setHomeSkillsEditorOpen(nextOpen);
              }}
            >
              Skills
            </Button>
          </>
        )}
        {slug === "contact" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              const draft = contactLayoutDraft ?? readContactLayoutFromDom();
              setContactLayoutDraft(draft);
              const nextOpen = !contactLayoutEditorOpen;
              closeExpandablePanels();
              setContactLayoutEditorOpen(nextOpen);
            }}
          >
            Contact blocks
          </Button>
        )}
        {slug === "about" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              const draft = aboutLayoutDraft ?? readAboutLayoutFromDom();
              setAboutLayoutDraft(draft);
              const nextOpen = !aboutLayoutEditorOpen;
              closeExpandablePanels();
              setAboutLayoutEditorOpen(nextOpen);
            }}
          >
            About sections
          </Button>
        )}
        {slug !== "blog" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setHistoryItems(readVersionHistory());
              void loadServerHistory();
              const nextOpen = !historyOpen;
              closeExpandablePanels();
              setHistoryOpen(nextOpen);
            }}
          >
            History
          </Button>
        ) : null}
        {slug !== "blog" ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={saveDraftNow}>
            Save Draft
          </Button>
        ) : null}
        {slug !== "blog" ? (
          <Button size="sm" className="gap-1.5" onClick={() => save()} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Publishing..." : "Publish"}
          </Button>
        ) : null}
        <Link href={exitHref} onClick={handleExit}>
          <Button size="sm" variant="outline" className="text-xs">
            Exit
          </Button>
        </Link>
      </div>
      {recoverableDraft && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs text-amber-800">{recoverableDraft.label}</p>
          <div className="mt-1 flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                restoreFromLocalDraft(recoverableDraft.draft, "local draft");
                setRecoverableDraft(null);
              }}
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setRecoverableDraft(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {historyOpen && (
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--foreground)]">Version history (local)</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.localStorage.removeItem(getVersionHistoryStorageKey());
                setHistoryItems([]);
                setStatus("Cleared local version history.");
              }}
            >
              Clear
            </Button>
          </div>
          {historyItems.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">No local versions yet. Save Draft to create one.</p>
          ) : (
            historyItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded border border-[var(--border)] px-2 py-1">
                <span className="text-[11px] text-[var(--muted-foreground)]">{new Date(item.savedAt).toLocaleString()}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => {
                    const ok = window.confirm("Restore this version?");
                    if (!ok) return;
                    restoreFromLocalDraft(item.draft, "version snapshot");
                  }}
                >
                  Restore
                </Button>
              </div>
            ))
          )}
          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <p className="mb-1 text-xs font-semibold text-[var(--foreground)]">Version history (server)</p>
            {serverHistoryLoading ? (
              <p className="text-xs text-[var(--muted-foreground)]">Loading server history...</p>
            ) : serverHistoryItems.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">No server revisions yet.</p>
            ) : (
              serverHistoryItems.map((item) => (
                <div key={item.id} className="mb-1 flex items-center justify-between gap-2 rounded border border-[var(--border)] px-2 py-1 last:mb-0">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {new Date(item.createdAt).toLocaleString()} ({item.mode})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    onClick={async () => {
                      const ok = window.confirm("Restore this server revision?");
                      if (!ok) return;
                      const res = await fetch(`/api/editor/revisions/${item.id}`, { cache: "no-store" });
                      if (!res.ok) {
                        setStatus("Failed to restore server revision.");
                        return;
                      }
                      const data = (await res.json()) as { snapshot?: LocalEditorDraft };
                      if (!data?.snapshot) {
                        setStatus("Revision snapshot is empty.");
                        return;
                      }
                      restoreFromLocalDraft(data.snapshot, "server revision");
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {siteEditorOpen && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Edit logo + names</p>
          <Input
            value={siteNameInput}
            onChange={(event) => setSiteNameInput(event.target.value)}
            placeholder="Site name"
            className="h-8 text-xs"
          />
          <Input
            value={authorNameInput}
            onChange={(event) => setAuthorNameInput(event.target.value)}
            placeholder="Author name (footer copyright)"
            className="h-8 text-xs"
          />
          <Input
            value={siteLogoInput}
            onChange={(event) => setSiteLogoInput(event.target.value)}
            placeholder="Logo URL"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setMediaTarget("site-logo");
              setMediaOpen(true);
            }}
          >
            Select logo from media
          </Button>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const nextDraft = {
                  siteName: siteNameInput.trim(),
                  authorName: authorNameInput.trim(),
                  logoUrl: siteLogoInput.trim(),
                };
                setSiteDraft(nextDraft);
                applySiteDraftToDom(nextDraft);
                setSiteEditorOpen(false);
                setStatus("Brand and author name updated. Click Save Changes.");
              }}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setSiteEditorOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {homeLayoutEditorOpen && slug === "home" && homeLayoutDraft && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Home sections</p>
          {homeLayoutDraft.sectionOrder.map((id, index) => (
            <div key={id} className="flex items-center justify-between gap-1 rounded border border-[var(--border)] px-2 py-1">
              <span className="text-xs text-[var(--foreground)]">
                {id === "latestPosts" ? "Latest posts" : id === "skills" ? "Skills" : "Hero"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setHomeLayoutDraft((current) => {
                      if (!current) return current;
                      const order = [...current.sectionOrder];
                      if (index <= 0) return current;
                      [order[index - 1], order[index]] = [order[index], order[index - 1]];
                      const next = { ...current, sectionOrder: order };
                      applyHomeLayoutDraftToDom(next);
                      setHomeLayoutDirty(true);
                      setStatus("Home section order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setHomeLayoutDraft((current) => {
                      if (!current) return current;
                      const order = [...current.sectionOrder];
                      if (index >= order.length - 1) return current;
                      [order[index + 1], order[index]] = [order[index], order[index + 1]];
                      const next = { ...current, sectionOrder: order };
                      applyHomeLayoutDraftToDom(next);
                      setHomeLayoutDirty(true);
                      setStatus("Home section order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Down
                </Button>
                <Button
                  size="sm"
                  variant={homeLayoutDraft.sectionVisibility[id] ? "outline" : "default"}
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setHomeLayoutDraft((current) => {
                      if (!current) return current;
                      const next = {
                        ...current,
                        sectionVisibility: {
                          ...current.sectionVisibility,
                          [id]: !current.sectionVisibility[id],
                        },
                      };
                      applyHomeLayoutDraftToDom(next);
                      setHomeLayoutDirty(true);
                      setStatus("Home section visibility updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  {homeLayoutDraft.sectionVisibility[id] ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {homeSkillsEditorOpen && slug === "home" && homeSkillsDraft && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Home skills</p>
          {homeSkillsDraft.map((skill, index) => (
            <div key={`${skill}-${index}`} className="flex items-center gap-1">
              <Input
                value={skill}
                onChange={(event) => {
                  const next = [...homeSkillsDraft];
                  next[index] = event.target.value;
                  setHomeSkillsDraft(next);
                }}
                className="h-7 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-1.5 text-[11px]"
                onClick={() => {
                  if (index <= 0) return;
                  const next = [...homeSkillsDraft];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  setHomeSkillsDraft(next);
                }}
              >
                Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-1.5 text-[11px]"
                onClick={() => {
                  if (index >= homeSkillsDraft.length - 1) return;
                  const next = [...homeSkillsDraft];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  setHomeSkillsDraft(next);
                }}
              >
                Down
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-1.5 text-[11px]"
                onClick={() => {
                  const next = homeSkillsDraft.filter((_, i) => i !== index);
                  setHomeSkillsDraft(next.length > 0 ? next : ["New skill"]);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setHomeSkillsDraft((current) => [...(current ?? []), "New skill"])}
            >
              Add skill
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const next = (homeSkillsDraft.map((s) => s.trim()).filter(Boolean));
                const normalized = next.length > 0 ? next : ["New skill"];
                setHomeSkillsDraft(normalized);
                applyHomeSkillsDraftToDom(normalized);
                setHomeSkillsDirty(true);
                setHomeSkillsEditorOpen(false);
                setStatus("Home skills updated. Click Save Changes.");
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
      {contactLayoutEditorOpen && slug === "contact" && contactLayoutDraft && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Contact blocks</p>
          {contactLayoutDraft.buttonOrder.map((id, index) => (
            <div key={id} className="flex items-center justify-between gap-1 rounded border border-[var(--border)] px-2 py-1">
              <span className="text-xs text-[var(--foreground)]">
                {id === "linkedin" ? "LinkedIn" : id === "github" ? "GitHub" : "Email"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setContactLayoutDraft((current) => {
                      if (!current || index <= 0) return current;
                      const order = [...current.buttonOrder];
                      [order[index - 1], order[index]] = [order[index], order[index - 1]];
                      const next = { ...current, buttonOrder: order };
                      applyContactLayoutDraftToDom(next);
                      setContactLayoutDirty(true);
                      setStatus("Contact block order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setContactLayoutDraft((current) => {
                      if (!current || index >= current.buttonOrder.length - 1) return current;
                      const order = [...current.buttonOrder];
                      [order[index + 1], order[index]] = [order[index], order[index + 1]];
                      const next = { ...current, buttonOrder: order };
                      applyContactLayoutDraftToDom(next);
                      setContactLayoutDirty(true);
                      setStatus("Contact block order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Down
                </Button>
                <Button
                  size="sm"
                  variant={contactLayoutDraft.buttonVisibility[id] ? "outline" : "default"}
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setContactLayoutDraft((current) => {
                      if (!current) return current;
                      const next = {
                        ...current,
                        buttonVisibility: {
                          ...current.buttonVisibility,
                          [id]: !current.buttonVisibility[id],
                        },
                      };
                      applyContactLayoutDraftToDom(next);
                      setContactLayoutDirty(true);
                      setStatus("Contact block visibility updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  {contactLayoutDraft.buttonVisibility[id] ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {aboutLayoutEditorOpen && slug === "about" && aboutLayoutDraft && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--foreground)]">About sections</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={async () => {
                const title = window.prompt("New section title", "Volunteer");
                const trimmed = (title ?? "").trim();
                if (!trimmed) return;
                const slugBase = trimmed
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "") || "section";
                const existingRes = await fetch("/api/about/config", { cache: "no-store" });
                const existing = existingRes.ok ? await existingRes.json() : {};
                const currentSections = Array.isArray(existing.customSections) ? existing.customSections : [];
                const ids = new Set(
                  currentSections
                    .map((item: unknown) =>
                      item && typeof item === "object" && "id" in item
                        ? String((item as { id?: unknown }).id ?? "")
                        : ""
                    )
                    .filter(Boolean)
                );
                let id = slugBase;
                let suffix = 2;
                while (ids.has(id)) {
                  id = `${slugBase}-${suffix}`;
                  suffix += 1;
                }
                const newSection = {
                  id,
                  title: trimmed,
                  blocks: [
                    {
                      title: "New title",
                      logoUrl: "",
                      organization: "Organization",
                      dateRange: "Date range",
                      content: "- New bullet",
                    },
                  ],
                };
                const existingOrder = Array.isArray(existing.sectionOrder) ? existing.sectionOrder : [];
                const existingVisibility =
                  existing.sectionVisibility && typeof existing.sectionVisibility === "object"
                    ? (existing.sectionVisibility as Record<string, boolean>)
                    : {};
                const nextOrder = [...existingOrder, `custom:${id}`];
                const nextVisibility = { ...existingVisibility, [`custom:${id}`]: true };
                const saveRes = await fetch("/api/about/config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...existing,
                    customSections: [...currentSections, newSection],
                    sectionOrder: nextOrder,
                    sectionVisibility: nextVisibility,
                  }),
                });
                if (!saveRes.ok) {
                  setStatus("Failed to add custom section.");
                  return;
                }
                setStatus("Custom section added.");
                window.location.reload();
              }}
            >
              Add section
            </Button>
          </div>
          {aboutLayoutDraft.sectionOrder.map((id, index) => (
            <div key={id} className="flex items-center justify-between gap-1 rounded border border-[var(--border)] px-2 py-1">
              <span className="text-xs text-[var(--foreground)]">
                {(() => {
                  if (id === "education") return "Education";
                  if (id === "experience") return "Experience";
                  if (id === "volunteer") return "Volunteer";
                  if (id === "projects") return "Projects";
                  if (id === "skills") return "Skills";
                  if (id === "achievements") return "Achievements";
                  if (id.startsWith("custom:")) {
                    const node = document.querySelector<HTMLElement>(
                      `main [data-about-content] > [data-about-section="${id}"] [data-about-edit$=".title"]`
                    );
                    return (node?.textContent ?? id.replace(/^custom:/, "")).trim();
                  }
                  return id;
                })()}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setAboutLayoutDraft((current) => {
                      if (!current || index <= 0) return current;
                      const order = [...current.sectionOrder];
                      [order[index - 1], order[index]] = [order[index], order[index - 1]];
                      const next = { ...current, sectionOrder: order };
                      applyAboutLayoutDraftToDom(next);
                      setAboutLayoutDirty(true);
                      setStatus("About section order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setAboutLayoutDraft((current) => {
                      if (!current || index >= current.sectionOrder.length - 1) return current;
                      const order = [...current.sectionOrder];
                      [order[index + 1], order[index]] = [order[index], order[index + 1]];
                      const next = { ...current, sectionOrder: order };
                      applyAboutLayoutDraftToDom(next);
                      setAboutLayoutDirty(true);
                      setStatus("About section order updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  Down
                </Button>
                <Button
                  size="sm"
                  variant={aboutLayoutDraft.sectionVisibility[id] ? "outline" : "default"}
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => {
                    setAboutLayoutDraft((current) => {
                      if (!current) return current;
                      const next = {
                        ...current,
                        sectionVisibility: {
                          ...current.sectionVisibility,
                          [id]: !current.sectionVisibility[id],
                        },
                      };
                      applyAboutLayoutDraftToDom(next);
                      setAboutLayoutDirty(true);
                      setStatus("About section visibility updated. Click Save Changes.");
                      return next;
                    });
                  }}
                >
                  {aboutLayoutDraft.sectionVisibility[id] ? "Hide" : "Show"}
                </Button>
                {id.startsWith("custom:") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-1.5 text-[11px]"
                    onClick={async () => {
                      const ok = window.confirm("Delete this custom section and all its blocks?");
                      if (!ok) return;
                      const sectionId = id.replace(/^custom:/, "");
                      const existingRes = await fetch("/api/about/config", { cache: "no-store" });
                      const existing = existingRes.ok ? await existingRes.json() : {};
                      const currentSections = Array.isArray(existing.customSections) ? existing.customSections : [];
                      const nextSections = currentSections.filter((item: unknown) => {
                        if (!item || typeof item !== "object") return false;
                        return String((item as { id?: unknown }).id ?? "") !== sectionId;
                      });
                      const existingOrder = Array.isArray(existing.sectionOrder) ? existing.sectionOrder : [];
                      const nextOrder = existingOrder.filter((value: unknown) => String(value) !== id);
                      const existingVisibility =
                        existing.sectionVisibility && typeof existing.sectionVisibility === "object"
                          ? (existing.sectionVisibility as Record<string, boolean>)
                          : {};
                      const nextVisibility = { ...existingVisibility };
                      delete nextVisibility[id];
                      const saveRes = await fetch("/api/about/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ...existing,
                          customSections: nextSections,
                          sectionOrder: nextOrder,
                          sectionVisibility: nextVisibility,
                        }),
                      });
                      if (!saveRes.ok) {
                        setStatus("Failed to delete custom section.");
                        return;
                      }
                      setStatus("Custom section deleted.");
                      window.location.reload();
                    }}
                  >
                    Del
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {buttonEditorOpen && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Edit button</p>
          <Input
            value={buttonEditorLabel}
            onChange={(event) => setButtonEditorLabel(event.target.value)}
            placeholder="Button name"
            className="h-8 text-xs"
          />
          <Input
            value={buttonEditorHref}
            onChange={(event) => setButtonEditorHref(event.target.value)}
            placeholder="Button URL (or email)"
            className="h-8 text-xs"
          />
          {buttonEditorTarget === "about.downloadCv" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={cvUploading}
              onClick={() => cvInputRef.current?.click()}
            >
              {cvUploading ? "Uploading CV..." : "Upload/replace CV file"}
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (!buttonEditorTarget) return;
                const nextDraft = {
                  label: buttonEditorLabel.trim(),
                  href: normalizeHrefForKey(buttonEditorTarget, buttonEditorHref),
                };
                setButtonDrafts((current) => ({ ...current, [buttonEditorTarget]: nextDraft }));
                applyButtonDraftToDom(buttonEditorTarget, nextDraft);
                setButtonEditorOpen(false);
                setStatus("Button updated. Click Save Changes.");
              }}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setButtonEditorOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {logoEditorOpen && slug === "about" && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Edit block logo</p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (!logoEditorKey) return;
                setMediaTarget("about-logo");
                setMediaOpen(true);
              }}
            >
              Select from media
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (!logoEditorKey) return;
                setLogoDrafts((current) => ({ ...current, [logoEditorKey]: "" }));
                applyLogoDraftToDom(logoEditorKey, "");
                setLogoEditorOpen(false);
                setStatus("Logo removed. Click Save Changes.");
              }}
            >
              Remove logo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setLogoEditorOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {footerEditorOpen && (
        <div className="mt-2 space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">Edit footer copyright text</p>
          <Input
            value={footerTextInput}
            onChange={(event) => setFooterTextInput(event.target.value)}
            placeholder="All rights reserved."
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const nextDraft = { footerText: footerTextInput.trim() || "All rights reserved." };
                setFooterDraft(nextDraft);
                applyFooterDraftToDom(nextDraft);
                setFooterEditorOpen(false);
                setStatus("Footer text updated. Click Save Changes.");
              }}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setFooterEditorOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {status ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{status}</p> : null}
      {lastAutoSavedAt ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Auto-saved: {new Date(lastAutoSavedAt).toLocaleTimeString()}</p>
      ) : null}
      {hasPendingChanges ? <p className="mt-1 text-xs text-amber-700">Unsaved changes</p> : null}
      <InsertMediaModal
        open={mediaOpen}
        onClose={() => {
          setMediaOpen(false);
          setSelectedImage(null);
          setMediaTarget("content-image");
        }}
        onSelect={(url) => {
          if (mediaTarget === "site-logo") {
            setSiteLogoInput(url);
            setMediaOpen(false);
            setMediaTarget("content-image");
            return;
          }
          if (mediaTarget === "about-logo") {
            if (!logoEditorKey) return;
            setLogoDrafts((current) => ({ ...current, [logoEditorKey]: url }));
            applyLogoDraftToDom(logoEditorKey, url);
            setLogoEditorOpen(false);
            setStatus("Logo updated. Click Save Changes.");
            setMediaOpen(false);
            setMediaTarget("content-image");
            return;
          }
          if (!selectedImage) return;
          selectedImage.setAttribute("src", url);
          setStatus("Image updated. Click Save Changes.");
          setMediaOpen(false);
          setSelectedImage(null);
        }}
      />
    </div>
  );
}
