"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useCmsFormSaveShortcut } from "@/hooks/use-cms-form-save-shortcut";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Paperclip, ImagePlus, Columns2, Smartphone, Tablet, Monitor } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { MarkdownTemplateInserter } from "@/components/markdown-template-inserter";
import { PostBodyPreview } from "@/components/dashboard/post-body-preview";
import { useSplitEditorScroll } from "@/components/dashboard/use-split-editor-scroll";
import { validateSlug, cn } from "@/lib/utils";
import { slugifyPostTitle } from "@/lib/cms-slug-from-title";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { markdownImageInsert } from "@/lib/markdown-image-insert";
import { subscribeCmsMediaInsert } from "@/lib/cms-media-insert";
import { useToast } from "@/contexts/toast-context";
import { DashboardKbd } from "@/components/dashboard/dashboard-ui";
import { DASHBOARD_FORM_LABEL_CLASS } from "@/components/dashboard/dashboard-form-classes";
import { normalizeMarkdownWhitespace } from "@/lib/cms-normalize-markdown";
import { PostDraftMarkdownStats } from "@/components/dashboard/post-draft-markdown-stats";

// Dynamic import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

export default function NewPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showInsertMedia, setShowInsertMedia] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [splitEditor, setSplitEditor] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [editorChromeDim, setEditorChromeDim] = useState(false);
  const reduceMotion = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { leftWrapRef, rightRef } = useSplitEditorScroll(splitEditor, content.length);

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

  const NEW_LOCAL_KEY = "cms-post-local:new";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NEW_LOCAL_KEY);
      if (!raw) return;
      const backup = JSON.parse(raw) as {
        savedAt: number;
        title?: string;
        slug?: string;
        content?: string;
        description?: string;
        tags?: string;
      };
      if (typeof backup.content === "string" && backup.content.trim()) {
        setContent(backup.content);
        if (typeof backup.title === "string") setTitle(backup.title);
        if (typeof backup.slug === "string") setSlug(backup.slug);
        if (typeof backup.description === "string") setDescription(backup.description);
        if (typeof backup.tags === "string") setTags(backup.tags);
        toast("Restored unsaved new-post draft from browser storage.", "success");
      }
    } catch {
      /* ignore */
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          NEW_LOCAL_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            title,
            slug,
            content,
            description,
            tags,
          })
        );
      } catch {
        /* quota */
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, slug, content, description, tags]);

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(slugifyPostTitle(newTitle));
  };

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

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
      setContent((prev) => prev + (prev ? "\n\n" : "") + block + "\n\n");
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
        setContent((prev) => prev + (prev ? "\n\n" : "") + block + "\n\n");
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
    const titleErr = title.trim() ? null : "Title is required";
    const slugRes = validateSlug(slug);
    setTitleError(titleErr);
    setSlugError(slugRes.valid ? null : slugRes.message ?? null);
    if (titleErr || !slugRes.valid) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
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
          category: category || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }

      try {
        localStorage.removeItem(NEW_LOCAL_KEY);
      } catch {
        /* ignore */
      }
      toast("Post created", "success");
      router.push("/dashboard/posts");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to create post", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertTemplateBlock = (markdown: string) => {
    setContent((prev) => prev + (prev ? "\n\n" : "") + markdown.trim() + "\n\n");
  };

  useEffect(() => {
    return subscribeCmsMediaInsert((md) => {
      setContent((prev) => prev + (prev ? "\n\n" : "") + md.trim() + "\n\n");
    });
  }, []);

  useCmsFormSaveShortcut(formRef, { enabled: true, submitting: isSubmitting });

  return (
    <div className="w-full max-w-[min(100%,1400px)] py-8">
      <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
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
                  onChange={(e) => { setSlugError(null); setSlug(e.target.value); }}
                  onBlur={() => {
                    const r = validateSlug(slug);
                    setSlugError(r.valid ? null : r.message ?? null);
                  }}
                  required
                  className={slugError ? "border-red-500" : ""}
                />
                {slugError && <p className="text-xs text-red-600">{slugError}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className={DASHBOARD_FORM_LABEL_CLASS}>
                  Description / Abstract
                </label>
                <Input
                  id="description"
                  placeholder="Brief description of this article (shown in card list, not in article body)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas
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
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Category path separated by slashes (e.g., LeetCode/Array). Used for note grouping and navigation
                </p>
              </div>

              <div
                className={`space-y-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOver ? "border-ring/40 bg-muted/25" : "border-transparent"
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
                      disabled={isUploading}
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
                      className="gap-2"
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
                  onSelect={(url) => setContent((prev) => prev + "\n\n![Image](" + url + ")\n\n")}
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
                    onTidyBody={() => setContent((c) => normalizeMarkdownWhitespace(c))}
                  />
                  <PostDraftMarkdownStats markdown={content} className="mt-2" />
                </motion.div>
                <div
                  className={splitEditor ? "grid items-start gap-4 lg:grid-cols-2" : ""}
                  data-color-mode="light"
                >
                  <div ref={leftWrapRef} className="min-w-0">
                    <MDEditor
                      value={content}
                      onChange={(val) => setContent(val || "")}
                      preview={splitEditor ? "edit" : "live"}
                      height={600}
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
                        "max-h-[600px] min-h-[320px] min-w-0 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24",
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
                    disabled={isUploading}
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
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Insert from Media
                  </Button>
                </motion.div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use toolbar for quick formatting. You can select multiple images to upload, or drag and drop images here.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border border-border bg-card text-foreground/90 accent-primary focus:ring-2 focus:ring-ring"
                />
                <label htmlFor="published" className={DASHBOARD_FORM_LABEL_CLASS}>
                  Publish immediately
                </label>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/posts")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Post"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <DashboardKbd className="px-1">⌘</DashboardKbd> or <DashboardKbd className="px-1">Ctrl</DashboardKbd> +{" "}
                  <DashboardKbd className="px-1">S</DashboardKbd> to submit from anywhere on this page.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="fixed bottom-20 right-4 z-40 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting}
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
              disabled={isSubmitting}
              className="gap-2"
              title="Insert images from media library"
            >
              <ImagePlus className="h-4 w-4" />
              Media
            </Button>
          </div>
        </div>
    </div>
  );
}
