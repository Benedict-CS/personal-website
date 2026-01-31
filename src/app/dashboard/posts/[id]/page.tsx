"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, History, RotateCcw, Loader2, Pin, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";

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

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [publishedDate, setPublishedDate] = useState("");
  const [category, setCategory] = useState(""); // 發布日期（createdAt）
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    category: string;
  } | null>(null);
  const lastAutosavedContentRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 載入文章資料
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const post = await response.json();
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
        const pd = post.createdAt ? new Date(post.createdAt).toISOString().split("T")[0] : "";
        initialRef.current = {
          title: post.title || "",
          slug: post.slug || "",
          content: post.content || "",
          description: post.description || "",
          tags: post.tags?.map((tag: { name: string }) => tag.name).join(", ") || "",
          published: post.published || false,
          pinned: post.pinned || false,
          publishedDate: pd,
          category: post.category || "",
        };
        lastAutosavedContentRef.current = post.content || "";
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
  }, [id, router]);

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
      category !== init.category;
    setDirty(isDirty);
  }, [title, slug, content, description, tags, published, pinned, publishedDate, category]);

  // Unsaved changes: beforeunload
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Autosave content (debounced 5s) - only when content changed from last saved
  useEffect(() => {
    if (content === lastAutosavedContentRef.current || isSubmitting) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/posts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, autosave: true }),
        });
        if (res.ok) {
          lastAutosavedContentRef.current = content;
          if (initialRef.current) {
            initialRef.current = { ...initialRef.current, content };
          }
          setDirty(
            title !== initialRef.current?.title ||
              slug !== initialRef.current?.slug ||
              description !== initialRef.current?.description ||
              tags !== initialRef.current?.tags ||
              published !== initialRef.current?.published ||
              pinned !== initialRef.current?.pinned ||
              publishedDate !== initialRef.current?.publishedDate ||
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
  }, [content, id, isSubmitting]);

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isSubmitting && !isDeleting) {
          formRef.current?.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, isDeleting]);

  // Mark form as dirty when user edits (ensures "Unsaved changes" shows)
  const markDirty = () => {
    if (!isLoading) setDirty(true);
  };

  // 自動生成 slug
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await response.json();
      const imageMarkdown = `![Image](${data.url})`;

      // 直接附加到內容末尾（MDEditor 會處理游標）
      setContent((prev) => prev + "\n\n" + imageMarkdown + "\n\n");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      // 重置 file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete post");
      }

      // 成功後跳轉回文章列表頁
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
    if (!confirm("Are you sure you want to restore this version? The current version will be saved as a new version.")) {
      return;
    }

    setIsRestoring(versionId);
    try {
      const response = await fetch(`/api/posts/${id}/versions/${versionId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Restore failed");
      }

      // 重新載入文章資料
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
            category: post.category || "",
          };
        }
        lastAutosavedContentRef.current = post.content || "";
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
                  onChange={handleTitleChange}
                  required
                />
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
                  onChange={(e) => { markDirty(); setSlug(e.target.value); }}
                  required
                />
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

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="content" className="text-sm font-medium text-slate-700">
                    Content
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSubmitting || isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div data-color-mode="light">
                  <MDEditor
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
                <p className="text-xs text-slate-500 mt-2">
                  Use toolbar for quick formatting: Bold, Italic, Code, Heading, List, etc.
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
                    <span className="text-green-700">{savedMessage}</span>
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
                    onClick={handleDelete}
                    disabled={isDeleting || isSubmitting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (dirty && !confirm("You have unsaved changes. Leave anyway?")) return;
                      router.push("/dashboard/posts");
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

            {/* 版本歷史對話框 */}
            {showVersions && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Version History</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowVersions(false)}
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
                                    版本 #{version.versionNumber}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {new Date(version.createdAt).toLocaleString("en-US")}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(version.id)}
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
