"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, History, RotateCcw, Loader2, Pin, ExternalLink, Maximize2, Minimize2, ImagePlus, Link2, Copy, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { MarkdownTemplateInserter } from "@/components/markdown-template-inserter";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useLeaveGuard } from "@/contexts/leave-guard-context";
import { validateSlug } from "@/lib/utils";

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

  // Load post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);
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
      } catch (error) {
        console.error("Error fetching post:", error);
        alert("Failed to load post");
        router.push("/dashboard/posts");
      } finally {
        setDirty(false);
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, router, setBreadcrumbOverride]);

  useEffect(() => {
    return () => setBreadcrumbOverride(null);
  }, [setBreadcrumbOverride]);

  useEffect(() => {
    setLeaveGuardDirty(dirty);
  }, [dirty, setLeaveGuardDirty]);

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

  // Ctrl/Cmd+S to save; Ctrl/Cmd+Enter to publish (set published and save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isSubmitting && !isDeleting) {
          formRef.current?.requestSubmit();
        }
      }
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

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    markDirty();
    const newTitle = e.target.value;
    setTitle(newTitle);
    const generatedSlug = newTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
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
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }
    const data = await res.json();
    return data.url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const images = files.filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));
    if (images.length === 0) {
      alert("Please select image files (JPEG, PNG, GIF, WebP).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const urls = await Promise.all(images.map((f) => uploadOne(f)));
      const block = urls.map((url) => `![Image](${url})`).join("\n\n");
      insertImageBlock(block);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
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
      .then((urls) => {
        const block = urls.map((url) => `![Image](${url})`).join("\n\n");
        insertImageBlock(block);
      })
      .catch((err) => alert(err instanceof Error ? err.message : "Upload failed"))
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
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update post");
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

      if (!stayOnPageAfterSave) {
        router.push("/dashboard/posts");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update post");
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
      alert(error instanceof Error ? error.message : "Failed to delete post");
      setIsDeleting(false);
    }
  };

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`/api/posts/${id}/versions`);
      if (!response.ok) {
        throw new Error("Failed to load versions");
      }
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
      alert("Failed to load version history");
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
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Restore failed");
      }

      // Reload post data
      const postResponse = await fetch(`/api/posts/${id}`);
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
      alert("Successfully restored to this version!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setIsRestoring(null);
    }
  };

  const handleGeneratePreviewLink = async () => {
    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`/api/posts/${id}/preview-token`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      setPreviewToken(data.token);
      await navigator.clipboard.writeText(data.previewUrl);
      setSavedMessage("Preview link copied to clipboard");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch {
      alert("Failed to generate preview link");
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
      alert("Failed to copy");
    }
  };

  const handleRevokePreviewLink = async () => {
    setIsRevokingPreview(true);
    try {
      const res = await fetch(`/api/posts/${id}/preview-token`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setPreviewToken(null);
      setSavedMessage("Preview link revoked");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch {
      alert("Failed to revoke preview link");
    } finally {
      setIsRevokingPreview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
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
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-slate-700">
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
                <label htmlFor="slug" className="text-sm font-medium text-slate-700">
                  Slug
                </label>
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
                    <label htmlFor="description" className="text-sm font-medium text-slate-700">
                      Description / Abstract
                    </label>
                    <Input
                      id="description"
                      placeholder="Brief description of this article (shown in card list, not in article body)"
                      value={description}
                      onChange={(e) => { markDirty(); setDescription(e.target.value); }}
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-500">
                      Optional, 1-2 sentences recommended (max 200 characters). Shown in Blog list cards
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tags" className="text-sm font-medium text-slate-700">
                      Tags
                    </label>
                    <Input
                      id="tags"
                      type="text"
                      placeholder="Linux, Server, Proxmox (comma separated)"
                      value={tags}
                      onChange={(e) => { markDirty(); setTags(e.target.value); }}
                    />
                    <p className="text-xs text-slate-500">
                      Separate multiple tags with commas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="publishedDate" className="text-sm font-medium text-slate-700">
                      Published Date
                    </label>
                    <Input
                      id="publishedDate"
                      type="date"
                      value={publishedDate}
                      onChange={(e) => { markDirty(); setPublishedDate(e.target.value); }}
                    />
                    <p className="text-xs text-slate-500">
                      Modify published date (shown in article list and detail page)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="scheduledPublishAt" className="text-sm font-medium text-slate-700">
                      Schedule publish at (optional)
                    </label>
                    <Input
                      id="scheduledPublishAt"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(e) => { markDirty(); setScheduledPublishAt(e.target.value); }}
                    />
                    <p className="text-xs text-slate-500">
                      When set and in the past, the post is shown as published even if &quot;Publish immediately&quot; is off
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium text-slate-700">
                      Category (Optional)
                    </label>
                    <Input
                      id="category"
                      type="text"
                      placeholder="e.g., LeetCode/Array, System Design, Algorithms/DP"
                      value={category}
                      onChange={(e) => { markDirty(); setCategory(e.target.value); }}
                    />
                    <p className="text-xs text-slate-500">
                      Category path separated by slashes (e.g., LeetCode/Array). Used for note grouping and navigation
                    </p>
                  </div>
                </>
              )}

              <div
                className={`space-y-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOver ? "border-slate-400 bg-slate-50" : "border-transparent"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-slate-50/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                  <label htmlFor="content" className="text-sm font-medium text-slate-700">
                    Content
                  </label>
                  <div className="flex items-center gap-2">
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
                </div>
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
                <MarkdownTemplateInserter onInsert={insertTemplateBlock} compact />
                <div data-color-mode="light">
                  <MDEditor
                    ref={editorRef}
                    value={content}
                    onChange={(val) => { markDirty(); setContent(val || ""); }}
                    preview="live"
                    height={720}
                    textareaProps={{
                      placeholder: "Enter post content in Markdown format...",
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
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
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
                </div>
                <p className="text-xs text-slate-500 mt-2">
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
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 border-slate-600 bg-slate-700"
                    />
                    <label htmlFor="published" className="text-sm font-medium text-slate-700">
                      Publish immediately
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={pinned}
                      onChange={(e) => { markDirty(); setPinned(e.target.checked); }}
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 border-slate-600 bg-slate-700"
                    />
                    <label htmlFor="pinned" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
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
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <label htmlFor="stayOnPage" className="text-sm font-medium text-slate-700">
                      Stay on page after save
                    </label>
                  </div>
                </div>
              )}

              {/* Sticky bar at bottom: status + actions (always visible when editing) */}
              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                    <span className="text-slate-500">All changes saved</span>
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
                      <div className="text-center py-8 text-slate-500">
                        Loading...
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No version history available
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versions.map((version) => {
                          const versionTags = JSON.parse(version.tags || "[]") as string[];
                          return (
                            <div
                              key={version.id}
                              className="border border-slate-200 rounded-lg p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-slate-900">
                                    Version #{version.versionNumber}
                                  </div>
                                  <div className="text-sm text-slate-500">
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
                                  <span className="font-medium text-slate-700">Title: </span>
                                  <span className="text-slate-900">{version.title}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">Slug：</span>
                                  <span className="text-slate-900">{version.slug}</span>
                                </div>
                                {versionTags.length > 0 && (
                                  <div>
                                    <span className="font-medium text-slate-700">Tags: </span>
                                    <span className="text-slate-900">
                                      {versionTags.join(", ")}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-slate-700">Status: </span>
                                  <span className="text-slate-900">
                                    {version.published ? "Published" : "Draft"}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">Content Preview: </span>
                                  <div className="mt-1 p-2 bg-slate-50 rounded text-xs text-slate-600 line-clamp-3">
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
      </div>
    </div>
  );
}
