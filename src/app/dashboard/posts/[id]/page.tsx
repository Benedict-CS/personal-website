"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { useCmsFormSaveShortcut } from "@/hooks/use-cms-form-save-shortcut";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Paperclip,
  History,
  RotateCcw,
  Loader2,
  Pin,
  ExternalLink,
  Maximize2,
  Minimize2,
  ImagePlus,
  Link2,
  Copy,
  Trash2,
  Columns2,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { MarkdownTemplateInserter } from "@/components/markdown-template-inserter";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useLeaveGuard } from "@/contexts/leave-guard-context";
import { validateSlug, cn } from "@/lib/utils";
import { markdownImageInsert } from "@/lib/markdown-image-insert";
import { subscribeCmsMediaInsert } from "@/lib/cms-media-insert";
import { DashboardKbd } from "@/components/dashboard/dashboard-ui";
import { DASHBOARD_FORM_LABEL_CLASS } from "@/components/dashboard/dashboard-form-classes";
import {
  DASHBOARD_DROP_ZONE_ACTIVE,
  DASHBOARD_DROP_ZONE_IDLE_TRANSPARENT,
} from "@/components/dashboard/dashboard-drag-zone-classes";
import { normalizeMarkdownWhitespace } from "@/lib/cms-normalize-markdown";
import { slugifyPostTitle } from "@/lib/cms-slug-from-title";
import { PostDraftMarkdownStats } from "@/components/dashboard/post-draft-markdown-stats";
import { PostBodyPreview } from "@/components/dashboard/post-body-preview";
import { useSplitEditorScroll } from "@/components/dashboard/use-split-editor-scroll";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { useToast } from "@/contexts/toast-context";

// Dynamic import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { setOverride: setBreadcrumbOverride } = useBreadcrumb();
  const { setDirty: setLeaveGuardDirty, registerHandler: registerLeaveHandler } = useLeaveGuard();
  const { toast } = useToast();
  const [pendingLeaveUrl, setPendingLeaveUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [publishedDate, setPublishedDate] = useState("");
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<Array<{
    id: string;
    versionNumber: number;
    createdAt: string;
    title: string;
    slug: string;
    tags: string;
    published: boolean;
    content: string;
  }>>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [stayOnPageAfterSave, setStayOnPageAfterSave] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [splitEditor, setSplitEditor] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [editorChromeDim, setEditorChromeDim] = useState(false);
  const reduceMotion = useReducedMotion();
  const [dirty, setDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [showInsertMedia, setShowInsertMedia] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isRevokingPreview, setIsRevokingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<{ textarea?: HTMLTextAreaElement } | null>(null);
  const { leftWrapRef, rightRef } = useSplitEditorScroll(splitEditor, content.length);
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialRef = useRef<{
    title: string;
    slug: string;
    content: string;
    description: string;
    tags: string;
    published: boolean;
    pinned: boolean;
    publishedDate: string;
    scheduledPublishAt: string;
    category: string;
  } | null>(null);
  const lastAutosavedContentRef = useRef<string | null>(null);
  const lastAutosavedMetaRef = useRef<{ title: string; slug: string; description: string; tags: string } | null>(null);
  /** Preserves the tab title when showing the unsaved-state prefix (light UI; no separate dark tab chrome). */
  const savedDocumentTitleRef = useRef<string | null>(null);

  const contentStats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    const rt = calculateReadingTime(content);
    return { words, readingLabel: formatReadingTime(rt) };
  }, [content]);

  const splitChromeOpacity = splitEditor && editorChromeDim ? (reduceMotion ? 0.72 : 0.42) : 1;

  useEffect(() => {
    const root = leftWrapRef.current;
    if (!root || !splitEditor) {
      setEditorChromeDim(false);
      return;
    }
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement) setEditorChromeDim(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement) setEditorChromeDim(false);
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [splitEditor, content.length, leftWrapRef]);

  // Load post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const post = await response.json();
        const postTitle = post.title || "";
        setTitle(postTitle);
        setSlug(post.slug || "");
        setContent(post.content || "");
        setDescription(post.description || "");
        setTags(post.tags?.map((tag: { name: string }) => tag.name).join(", ") || "");
        setPublished(post.published || false);
        setPinned(post.pinned || false);
        setCategory(post.category || "");
        if (post.createdAt) {
          const date = new Date(post.createdAt);
          setPublishedDate(date.toISOString().split("T")[0]);
        }
        if (post.publishedAt) {
          setScheduledPublishAt(new Date(post.publishedAt).toISOString().slice(0, 16));
        } else {
          setScheduledPublishAt("");
        }
        setBreadcrumbOverride({ label: postTitle });
        lastAutosavedMetaRef.current = {
          title: post.title || "",
          slug: post.slug || "",
          description: post.description || "",
          tags: post.tags?.map((t: { name: string }) => t.name).join(", ") || "",
        };
        const pd = post.createdAt ? new Date(post.createdAt).toISOString().split("T")[0] : "";
        const spa = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : "";
        initialRef.current = {
          title: post.title || "",
          slug: post.slug || "",
          content: post.content || "",
          description: post.description || "",
          tags: post.tags?.map((tag: { name: string }) => tag.name).join(", ") || "",
          published: post.published || false,
          pinned: post.pinned || false,
          publishedDate: pd,
          scheduledPublishAt: spa,
          category: post.category || "",
        };
        lastAutosavedContentRef.current = post.content || "";
        setPreviewToken(post.previewToken || null);

        const serverUpdated = new Date(post.updatedAt).getTime();
        try {
          const raw = localStorage.getItem(`cms-post-local:${id}`);
          if (raw) {
            const backup = JSON.parse(raw) as {
              savedAt: number;
              content: string;
              title?: string;
              description?: string;
              tags?: string;
            };
            if (
              typeof backup.savedAt === "number" &&
              backup.savedAt > serverUpdated + 1000 &&
              typeof backup.content === "string" &&
              backup.content !== post.content
            ) {
              setContent(backup.content);
              if (typeof backup.title === "string") setTitle(backup.title);
              if (typeof backup.description === "string") setDescription(backup.description);
              if (typeof backup.tags === "string") setTags(backup.tags);
              setDirty(true);
              toast("Restored a newer draft from browser storage.", "success");
            }
          }
        } catch {
          /* ignore corrupt local draft */
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        toast("Could not load this post. Returning to the post list.", "error");
        router.push("/dashboard/posts");
      } finally {
        setDirty(false);
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, router, setBreadcrumbOverride, toast]);

  useEffect(() => {
    return () => setBreadcrumbOverride(null);
  }, [setBreadcrumbOverride]);

  useEffect(() => {
    setLeaveGuardDirty(dirty);
  }, [dirty, setLeaveGuardDirty]);

  useEffect(() => {
    if (dirty) {
      if (savedDocumentTitleRef.current === null) {
        savedDocumentTitleRef.current = document.title;
      }
      document.title = `Unsaved · ${title.trim() || "Post"}`;
    } else if (savedDocumentTitleRef.current !== null) {
      document.title = savedDocumentTitleRef.current;
      savedDocumentTitleRef.current = null;
    }
  }, [dirty, title]);

  useEffect(() => {
    return () => {
      if (savedDocumentTitleRef.current !== null) {
        document.title = savedDocumentTitleRef.current;
        savedDocumentTitleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    registerLeaveHandler((url) => {
      setPendingLeaveUrl(url);
      setShowLeaveConfirm(true);
    });
    return () => registerLeaveHandler(null);
  }, [registerLeaveHandler]);

  // Track dirty state
  useEffect(() => {
    if (!initialRef.current) return;
    const init = initialRef.current;
    const isDirty =
      title !== init.title ||
      slug !== init.slug ||
      content !== init.content ||
      description !== init.description ||
      tags !== init.tags ||
      published !== init.published ||
      pinned !== init.pinned ||
      publishedDate !== init.publishedDate ||
      scheduledPublishAt !== init.scheduledPublishAt ||
      category !== init.category;
    setDirty(isDirty);
  }, [title, slug, content, description, tags, published, pinned, publishedDate, scheduledPublishAt, category]);

  // Unsaved changes: beforeunload
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Esc to close version history modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowVersions(false);
    };
    if (showVersions) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [showVersions]);

  // Autosave content + title/slug/description/tags (debounced 5s)
  useEffect(() => {
    const contentChanged = content !== lastAutosavedContentRef.current;
    const metaChanged = !lastAutosavedMetaRef.current ||
      lastAutosavedMetaRef.current.title !== title ||
      lastAutosavedMetaRef.current.slug !== slug ||
      lastAutosavedMetaRef.current.description !== description ||
      lastAutosavedMetaRef.current.tags !== tags;
    if ((!contentChanged && !metaChanged) || isSubmitting) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/posts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug,
            content,
            description,
            tags,
            published,
            pinned,
            createdAt: publishedDate ? new Date(publishedDate).toISOString() : undefined,
            category: category || null,
            autosave: true,
          }),
        });
        if (res.ok) {
          lastAutosavedContentRef.current = content;
          lastAutosavedMetaRef.current = { title, slug, description, tags };
          if (initialRef.current) {
            initialRef.current = { ...initialRef.current, content, title, slug, description, tags };
          }
          setDirty(
            published !== initialRef.current?.published ||
              pinned !== initialRef.current?.pinned ||
              publishedDate !== initialRef.current?.publishedDate ||
              scheduledPublishAt !== initialRef.current?.scheduledPublishAt ||
              category !== initialRef.current?.category
          );
          setSavedMessage("Draft saved");
          setTimeout(() => setSavedMessage(null), 3000);
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [content, title, slug, description, tags, published, pinned, publishedDate, scheduledPublishAt, category, id, isSubmitting]);

  // Local draft backup (survives refresh if the server is older)
  useEffect(() => {
    if (isLoading || !id) return;
    const timer = window.setTimeout(() => {
      try {
        const payload = {
          savedAt: Date.now(),
          content,
          title,
          description,
          tags,
        };
        localStorage.setItem(`cms-post-local:${id}`, JSON.stringify(payload));
      } catch {
        /* quota */
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, title, description, tags, id, isLoading]);

  useCmsFormSaveShortcut(formRef, {
    enabled: true,
    submitting: isSubmitting || isDeleting,
  });

  // Ctrl/Cmd+Enter — publish and save (draft → published)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isSubmitting && !isDeleting && !published) {
          setPublished(true);
          setDirty(true);
          setTimeout(() => formRef.current?.requestSubmit(), 0);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, isDeleting, published]);

  // Mark form as dirty when user edits (ensures "Unsaved changes" shows)
  const markDirty = () => {
    if (!isLoading) setDirty(true);
  };

  /** Title edits no longer overwrite the slug (protects published URLs); use "Regenerate from title" when intentional. */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    markDirty();
    setTitle(e.target.value);
  };

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

  const insertImageBlock = (block: string) => {
    markDirty();
    const pos = cursorPosRef.current;
    if (pos != null && pos.start >= 0 && pos.end >= 0) {
      setContent((prev) => prev.slice(0, pos.start) + block + prev.slice(pos.end));
      cursorPosRef.current = null;
    } else {
      setContent((prev) => prev + (prev ? "\n\n" : "") + block + "\n\n");
    }
  };

  const insertTemplateBlock = (markdown: string) => {
    insertImageBlock(markdown.trim() + "\n");
  };

  const insertImageBlockRef = useRef(insertImageBlock);
  insertImageBlockRef.current = insertImageBlock;
  useEffect(() => {
    return subscribeCmsMediaInsert((md) => {
      insertImageBlockRef.current(`${md.trim()}\n`);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let removeBlur: (() => void) | null = null;
    const tryAttach = () => {
      if (cancelled) return;
      const ta = editorRef.current?.textarea;
      if (!ta) {
        timeoutId = setTimeout(tryAttach, 100);
        return;
      }
      const onBlur = () => {
        cursorPosRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
      };
      ta.addEventListener("blur", onBlur);
      removeBlur = () => ta.removeEventListener("blur", onBlur);
    };
    tryAttach();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      removeBlur?.();
    };
  }, []);

  const uploadOne = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }
    const data = (await res.json()) as {
      url: string;
      width?: number | null;
      height?: number | null;
      variants?: Array<{ descriptor: number; url: string }>;
    };
    return markdownImageInsert(data.url, file.name, data.width, data.height, data.variants ?? null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const images = files.filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));
    if (images.length === 0) {
      toast("Please select image files (JPEG, PNG, GIF, or WebP).", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const lines = await Promise.all(images.map((f) => uploadOne(f)));
      const block = lines.join("\n\n");
      insertImageBlock(block);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_IMAGE_TYPES.includes(f.type)
    );
    if (files.length === 0) return;
    setIsUploading(true);
    Promise.all(files.map((f) => uploadOne(f)))
      .then((lines) => {
        const block = lines.join("\n\n");
        insertImageBlock(block);
      })
      .catch((err) => toast(err instanceof Error ? err.message : "Upload failed", "error"))
      .finally(() => setIsUploading(false));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title,
      slug,
      content,
      description,
      tags,
      published,
      pinned,
      createdAt: publishedDate ? new Date(publishedDate).toISOString() : undefined,
      publishedAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      category: category || null,
    };

    if (stayOnPageAfterSave) {
      const prevInitial = initialRef.current;
      setSavedMessage("Saved");
      setDirty(false);
      lastAutosavedContentRef.current = content;
      lastAutosavedMetaRef.current = { title, slug, description, tags };
      if (initialRef.current) {
        initialRef.current = {
          title,
          slug,
          content,
          description,
          tags,
          published,
          pinned,
          publishedDate,
          scheduledPublishAt,
          category,
        };
      }
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/posts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(typeof error?.error === "string" ? error.error : "Failed to update post");
        }
        try {
          localStorage.removeItem(`cms-post-local:${id}`);
        } catch {
          /* ignore */
        }
        setTimeout(() => setSavedMessage(null), 2500);
      } catch (error) {
        setDirty(true);
        initialRef.current = prevInitial ?? initialRef.current;
        if (prevInitial) {
          lastAutosavedContentRef.current = prevInitial.content;
          lastAutosavedMetaRef.current = {
            title: prevInitial.title,
            slug: prevInitial.slug,
            description: prevInitial.description,
            tags: prevInitial.tags,
          };
        }
        setSavedMessage(null);
        toast(error instanceof Error ? error.message : "Failed to update post", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setSavedMessage("Saving…");

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update post");
      }

      try {
        localStorage.removeItem(`cms-post-local:${id}`);
      } catch {
        /* ignore */
      }

      lastAutosavedContentRef.current = content;
      if (initialRef.current) {
        initialRef.current = {
          title,
          slug,
          content,
          description,
          tags,
          published,
          pinned,
          publishedDate,
          scheduledPublishAt,
          category,
        };
      }
      setDirty(false);
      setSavedMessage("Saved");
      setTimeout(() => setSavedMessage(null), 2500);

      router.push("/dashboard/posts");
    } catch (error) {
      setSavedMessage(null);
      toast(error instanceof Error ? error.message : "Failed to update post", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete post");
      }
      setShowDeleteConfirm(false);
      router.push("/dashboard/posts");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to delete post", "error");
      setIsDeleting(false);
    }
  };

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`/api/posts/${id}/versions`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load versions");
      }
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
      toast("Failed to load version history", "error");
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleShowVersions = () => {
    setShowVersions(true);
    loadVersions();
  };

  const handleRestore = async (versionId: string) => {
    setRestoreConfirmId(null);
    setIsRestoring(versionId);
    try {
      const response = await fetch(`/api/posts/${id}/versions/${versionId}/restore`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Restore failed");
      }

      // Reload post data
      const postResponse = await fetch(`/api/posts/${id}`, { credentials: "include" });
      if (postResponse.ok) {
        const post = await postResponse.json();
        setTitle(post.title || "");
        setSlug(post.slug || "");
        setContent(post.content || "");
        setDescription(post.description || "");
        setTags(post.tags?.map((tag: { name: string }) => tag.name).join(", ") || "");
        setPublished(post.published || false);
        setPinned(post.pinned || false);
        setCategory(post.category || "");
        if (post.createdAt) {
          const date = new Date(post.createdAt);
          setPublishedDate(date.toISOString().split("T")[0]);
        }
        if (initialRef.current) {
          initialRef.current = {
            title: post.title || "",
            slug: post.slug || "",
            content: post.content || "",
            description: post.description || "",
            tags: post.tags?.map((t: { name: string }) => t.name).join(", ") || "",
            published: post.published || false,
            pinned: post.pinned || false,
            publishedDate: post.createdAt ? new Date(post.createdAt).toISOString().split("T")[0] : "",
            scheduledPublishAt: "",
            category: post.category || "",
          };
        }
        lastAutosavedContentRef.current = post.content || "";
        setPreviewToken(post.previewToken ?? null);
        setBreadcrumbOverride({ label: post.title || "" });
        lastAutosavedMetaRef.current = {
          title: post.title || "",
          slug: post.slug || "",
          description: post.description || "",
          tags: post.tags?.map((t: { name: string }) => t.name).join(", ") || "",
        };
      }
      setShowVersions(false);
      setDirty(false);
      toast("Restored to this version.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Restore failed", "error");
    } finally {
      setIsRestoring(null);
    }
  };

  const handleGeneratePreviewLink = async () => {
    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`/api/posts/${id}/preview-token`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      setPreviewToken(data.token);
      await navigator.clipboard.writeText(data.previewUrl);
      setSavedMessage("Preview link copied to clipboard");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch {
      toast("Failed to generate preview link", "error");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleCopyPreviewLink = async () => {
    if (!previewToken) return;
    const url = `${window.location.origin}/blog/preview?token=${previewToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setSavedMessage("Preview link copied to clipboard");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch {
      toast("Could not copy to clipboard", "error");
    }
  };

  const handleCopyPublicPostUrl = async () => {
    if (!slug.trim()) return;
    try {
      const url = `${window.location.origin}/blog/${encodeURIComponent(slug.trim())}`;
      await navigator.clipboard.writeText(url);
      toast("Public post URL copied", "success");
    } catch {
      toast("Could not copy to clipboard", "error");
    }
  };

  const handleRevokePreviewLink = async () => {
    setIsRevokingPreview(true);
    try {
      const res = await fetch(`/api/posts/${id}/preview-token`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to revoke");
      setPreviewToken(null);
      setSavedMessage("Preview link revoked");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch {
      toast("Failed to revoke preview link", "error");
    } finally {
      setIsRevokingPreview(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-[50vh] bg-background py-8"
        role="status"
        aria-busy="true"
        aria-label="Loading post"
      >
        <div
          className="w-full mx-auto edit-page-max px-4"
          style={{
            maxWidth: "min(80rem, calc(100vw - var(--dashboard-sidebar-width, 16rem) - 4rem))",
          }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full max-w-xl" />
              <Skeleton className="h-10 w-full max-w-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="min-h-[12rem] w-full rounded-xl" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-sm text-muted-foreground">Loading post…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div
        className="w-full mx-auto edit-page-max"
        style={{
          maxWidth: "min(80rem, calc(100vw - var(--dashboard-sidebar-width, 16rem) - 4rem))",
        }}
      >
        <Card>
          <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Edit Post</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusMode((v) => !v)}
                  className="flex items-center gap-2"
                  title={focusMode ? "Exit focus mode" : "Focus mode (title + content only)"}
                >
                  {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {focusMode ? "Exit focus" : "Focus"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const path = published ? `/blog/${slug}` : `/dashboard/notes/${slug}`;
                    window.open(`${base}${path}`, "_blank", "noopener");
                  }}
                  disabled={!slug}
                  className="flex items-center gap-2"
                  title={published ? "Preview as blog post" : "Preview as note"}
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
                {published && slug.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyPublicPostUrl()}
                    className="flex items-center gap-2"
                    title="Copy canonical blog URL to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                    Copy public URL
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShowVersions}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Version History
                </Button>
                {previewToken ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPreviewLink}
                      className="flex items-center gap-2"
                      title="Copy read-only preview link"
                    >
                      <Copy className="h-4 w-4" />
                      Copy preview link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRevokePreviewLink}
                      disabled={isRevokingPreview}
                      className="flex items-center gap-2"
                      title="Revoke link so it stops working"
                    >
                      {isRevokingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Revoke link
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreviewLink}
                    disabled={isGeneratingPreview}
                    className="flex items-center gap-2"
                    title="Generate a shareable read-only link for this draft"
                  >
                    {isGeneratingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    {isGeneratingPreview ? "Generating..." : "Share draft link"}
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-4 w-full max-w-full rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:max-w-3xl">
              <span className="font-medium text-foreground">Draft preview:</span> Use &quot;Share draft link&quot; to create a read-only URL
              with a secret token (
              <code className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[11px] text-foreground">
                /blog/preview?token=…
              </code>
              ). Visiting{" "}
              <code className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[11px] text-foreground">/blog/preview</code>{" "}
              without a token shows a help page, not your draft. Analytics stores referrers without the token for privacy.
            </p>
            <details className="mt-3 w-full max-w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:max-w-3xl">
              <summary className="cursor-pointer select-none font-medium text-foreground">Editor shortcuts and preview tips</summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
                <li>
                  <DashboardKbd className="px-1 text-[11px]">⌘/Ctrl</DashboardKbd> + <DashboardKbd className="px-1 text-[11px]">S</DashboardKbd>{" "}
                  — Save (submit)
                </li>
                <li>
                  <DashboardKbd className="px-1 text-[11px]">⌘/Ctrl</DashboardKbd> +{" "}
                  <DashboardKbd className="px-1 text-[11px]">Enter</DashboardKbd> — Publish and save (when not already published)
                </li>
                <li>
                  Live Markdown preview uses the <strong className="text-foreground/90">light</strong> theme only (split view below the
                  editor).
                </li>
                <li>
                  &quot;Preview&quot; opens the public or note URL; &quot;Share draft link&quot; is for reviewers without a
                  login.
                </li>
              </ul>
            </details>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className={DASHBOARD_FORM_LABEL_CLASS}>
                  Title
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => { setTitleError(null); handleTitleChange(e); }}
                  onBlur={() => setTitleError(title.trim() ? null : "Title is required")}
                  required
                  className={titleError ? "border-red-500" : ""}
                />
                {titleError && <p className="text-xs text-red-600">{titleError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="slug" className={DASHBOARD_FORM_LABEL_CLASS}>
                    Slug
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      markDirty();
                      setSlugError(null);
                      setSlug(slugifyPostTitle(title));
                    }}
                  >
                    Regenerate from title
                  </Button>
                </div>
                <Input
                  id="slug"
                  type="text"
                  placeholder="post-url-slug"
                  value={slug}
                  onChange={(e) => { markDirty(); setSlugError(null); setSlug(e.target.value); }}
                  onBlur={() => {
                    const r = validateSlug(slug);
                    setSlugError(r.valid ? null : r.message ?? null);
                  }}
                  required
                  className={slugError ? "border-red-500" : ""}
                />
                {slugError && <p className="text-xs text-red-600">{slugError}</p>}
              </div>

              {!focusMode && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="description" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Description / Abstract
                    </label>
                    <Input
                      id="description"
                      placeholder="Brief description of this article (shown in card list, not in article body)"
                      value={description}
                      onChange={(e) => { markDirty(); setDescription(e.target.value); }}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional, 1-2 sentences recommended (max 200 characters). Shown in Blog list cards
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tags" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Tags
                    </label>
                    <Input
                      id="tags"
                      type="text"
                      placeholder="Linux, Server, Proxmox (comma separated)"
                      value={tags}
                      onChange={(e) => { markDirty(); setTags(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple tags with commas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="publishedDate" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Published Date
                    </label>
                    <Input
                      id="publishedDate"
                      type="date"
                      lang="en-US"
                      value={publishedDate}
                      onChange={(e) => { markDirty(); setPublishedDate(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Modify published date (shown in article list and detail page)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="scheduledPublishAt" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Schedule publish at (optional)
                    </label>
                    <Input
                      id="scheduledPublishAt"
                      type="datetime-local"
                      lang="en-US"
                      value={scheduledPublishAt}
                      onChange={(e) => { markDirty(); setScheduledPublishAt(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      When set and in the past, the post is shown as published even if &quot;Publish immediately&quot; is off
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Format: YYYY-MM-DD HH:mm (24-hour clock)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Category (Optional)
                    </label>
                    <Input
                      id="category"
                      type="text"
                      placeholder="e.g., LeetCode/Array, System Design, Algorithms/DP"
                      value={category}
                      onChange={(e) => { markDirty(); setCategory(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Category path separated by slashes (e.g., LeetCode/Array). Used for note grouping and navigation
                    </p>
                  </div>
                </>
              )}

              <div
                className={`space-y-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOver ? DASHBOARD_DROP_ZONE_ACTIVE : DASHBOARD_DROP_ZONE_IDLE_TRANSPARENT
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <motion.div
                  animate={{ opacity: splitChromeOpacity }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b border-border bg-card/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/35"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <label htmlFor="content" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Content
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                      {contentStats.words.toLocaleString()} words · ~{contentStats.readingLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={splitEditor ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSplitEditor((v) => !v)}
                      className="gap-1.5"
                      title="Source on the left, live preview on the right (MDX embeds render in preview)"
                    >
                      <Columns2 className="h-4 w-4" />
                      Split
                    </Button>
                    {splitEditor ? (
                      <div
                        className="flex items-center rounded-lg border border-border bg-muted/25 p-0.5"
                        role="group"
                        aria-label="Preview device width"
                      >
                        <Button
                          type="button"
                          variant={previewDevice === "mobile" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewDevice("mobile")}
                          title="Mobile preview (~390px)"
                          aria-pressed={previewDevice === "mobile"}
                        >
                          <Smartphone className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant={previewDevice === "tablet" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewDevice("tablet")}
                          title="Tablet preview (~820px)"
                          aria-pressed={previewDevice === "tablet"}
                        >
                          <Tablet className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant={previewDevice === "desktop" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewDevice("desktop")}
                          title="Full-width preview"
                          aria-pressed={previewDevice === "desktop"}
                        >
                          <Monitor className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSubmitting || isDeleting}
                      className="flex items-center gap-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      {isUploading ? "Uploading..." : "Upload images"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInsertMedia(true)}
                      disabled={isSubmitting || isDeleting}
                      className="flex items-center gap-2"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Insert from Media
                    </Button>
                  </div>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <InsertMediaModal
                  open={showInsertMedia}
                  onClose={() => setShowInsertMedia(false)}
                  onSelect={(url) => {
                    insertImageBlock("![Image](" + url + ")");
                  }}
                />
                <motion.div
                  animate={{ opacity: splitChromeOpacity }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <MarkdownTemplateInserter
                    onInsert={insertTemplateBlock}
                    sourceMarkdown={content}
                    postSlug={slug}
                    compact
                    onTidyBody={() => {
                      markDirty();
                      setContent((c) => normalizeMarkdownWhitespace(c));
                    }}
                  />
                  <PostDraftMarkdownStats markdown={content} className="mt-2" />
                </motion.div>
                <div
                  className={splitEditor ? "grid items-start gap-4 lg:grid-cols-2" : ""}
                  data-color-mode="light"
                >
                  <div ref={leftWrapRef} className="min-w-0">
                    <MDEditor
                      ref={editorRef}
                      value={content}
                      onChange={(val) => {
                        markDirty();
                        setContent(val || "");
                      }}
                      preview={splitEditor ? "edit" : "live"}
                      height={720}
                      textareaProps={{
                        placeholder:
                          "Markdown or MDX. Embed: <CodePlayground />, <AbTestStats />, <TechStackGrid />",
                        required: true,
                      }}
                      previewOptions={{
                        components: {
                          code: ({ children, className }) => {
                            return <code className={className}>{children}</code>;
                          },
                        },
                      }}
                    />
                  </div>
                  {splitEditor ? (
                    <div
                      ref={rightRef}
                      className={cn(
                        "max-h-[720px] min-h-[320px] min-w-0 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24",
                        previewDevice === "mobile" && "mx-auto w-full max-w-[390px] shadow-inner",
                        previewDevice === "tablet" && "mx-auto w-full max-w-[820px] shadow-inner"
                      )}
                    >
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Live preview
                      </p>
                      <PostBodyPreview content={content} />
                    </div>
                  ) : null}
                </div>
                <motion.div
                  animate={{ opacity: splitChromeOpacity }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex items-center justify-end gap-2 border-t border-border/50 pt-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSubmitting || isDeleting}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload images"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInsertMedia(true)}
                    disabled={isSubmitting || isDeleting}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Insert from Media
                  </Button>
                </motion.div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use toolbar for quick formatting. You can select multiple images to upload, or drag and drop images here. Images insert at cursor when the editor had focus before clicking upload.
                </p>
              </div>

              {!focusMode && (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="published"
                      checked={published}
                      onChange={(e) => { markDirty(); setPublished(e.target.checked); }}
                      className="h-4 w-4 rounded border border-border bg-card text-foreground/90 accent-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="published" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Publish immediately
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={pinned}
                      onChange={(e) => { markDirty(); setPinned(e.target.checked); }}
                      className="h-4 w-4 rounded border border-border bg-card text-foreground/90 accent-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="pinned" className={cn(DASHBOARD_FORM_LABEL_CLASS, "flex items-center gap-1.5")}>
                      <Pin className="h-4 w-4" />
                      Pin to top
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stayOnPage"
                      checked={stayOnPageAfterSave}
                      onChange={(e) => setStayOnPageAfterSave(e.target.checked)}
                      className="h-4 w-4 rounded border border-border bg-card text-foreground/90 accent-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="stayOnPage" className={DASHBOARD_FORM_LABEL_CLASS}>
                      Stay on page after save
                    </label>
                  </div>
                </div>
              )}

              {/* Sticky bar at bottom: status + actions (always visible when editing) */}
              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4 shadow-[0_-4px_6px_-1px_oklch(0.2_0.02_265/0.06)]">
                <div className="text-sm font-medium">
                  {savedMessage && (
                    <span className="text-green-700">
                      {savedMessage}
                      {savedMessage === "Saved" && slug && (
                        <> — <a href={`/blog/${slug}`} className="underline hover:text-green-800">View on site</a></>
                      )}
                    </span>
                  )}
                  {dirty && !savedMessage && (
                    <span className="text-amber-700">You have unsaved changes — save or cancel to leave.</span>
                  )}
                  {!dirty && !savedMessage && (
                    <span className="text-muted-foreground">All changes saved</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting || isSubmitting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (dirty) {
                        setPendingLeaveUrl("/dashboard/posts");
                        setShowLeaveConfirm(true);
                      } else router.push("/dashboard/posts");
                    }}
                    disabled={isSubmitting || isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isDeleting}>
                    {isSubmitting ? "Updating..." : "Update Post"}
                  </Button>
                </div>
              </div>
            </form>

            <ConfirmDialog
              open={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              title="Delete post"
              description="Are you sure you want to delete this post? This action cannot be undone."
              confirmLabel="Delete"
              variant="danger"
              onConfirm={handleDelete}
              loading={isDeleting}
            />
            <ConfirmDialog
              open={showLeaveConfirm}
              onClose={() => { setShowLeaveConfirm(false); setPendingLeaveUrl(null); }}
              title="Unsaved changes"
              description="You have unsaved changes. Leave anyway?"
              confirmLabel="Leave"
              onConfirm={() => {
                setShowLeaveConfirm(false);
                const url = pendingLeaveUrl ?? "/dashboard/posts";
                setPendingLeaveUrl(null);
                setLeaveGuardDirty(false);
                router.push(url);
              }}
            />
            {restoreConfirmId && (
              <ConfirmDialog
                open={!!restoreConfirmId}
                onClose={() => setRestoreConfirmId(null)}
                title="Restore version"
                description="Restore to this version? The current content will be saved as a new version in history."
                confirmLabel="Restore"
                onConfirm={() => handleRestore(restoreConfirmId)}
              />
            )}
            {/* Version history dialog */}
            {showVersions && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                role="dialog"
                aria-modal="true"
              >
                <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Version History</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowVersions(false)}
                        title="Close (Esc)"
                      >
                        ✕
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
                    {isLoadingVersions ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading...
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No version history available
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versions.map((version) => {
                          const versionTags = JSON.parse(version.tags || "[]") as string[];
                          return (
                            <div
                              key={version.id}
                              className="border border-border rounded-lg p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-foreground">
                                    Version #{version.versionNumber}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(version.createdAt).toLocaleString("en-US")}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRestoreConfirmId(version.id)}
                                  disabled={isRestoring === version.id}
                                  className="flex items-center gap-2"
                                >
                                  {isRestoring === version.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Restoring...
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="h-4 w-4" />
                                      Restore to this version
                                    </>
                                  )}
                                </Button>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-foreground/90">Title: </span>
                                  <span className="text-foreground">{version.title}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground/90">Slug：</span>
                                  <span className="text-foreground">{version.slug}</span>
                                </div>
                                {versionTags.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground/90">Tags: </span>
                                    <span className="text-foreground">
                                      {versionTags.join(", ")}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-foreground/90">Status: </span>
                                  <span className="text-foreground">
                                    {version.published ? "Published" : "Draft"}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground/90">Content Preview: </span>
                                  <div className="mt-1 p-2 bg-muted/30 rounded text-xs text-muted-foreground line-clamp-3">
                                    {version.content.substring(0, 200)}
                                    {version.content.length > 200 ? "..." : ""}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="fixed bottom-20 right-4 z-40 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting || isDeleting}
              className="gap-2"
              title="Upload images without scrolling"
            >
              <Paperclip className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInsertMedia(true)}
              disabled={isSubmitting || isDeleting}
              className="gap-2"
              title="Insert images from media library"
            >
              <ImagePlus className="h-4 w-4" />
              Media
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
