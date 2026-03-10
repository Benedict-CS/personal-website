"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, ImagePlus } from "lucide-react";
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
import { validateSlug } from "@/lib/utils";

// Dynamic import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

export default function NewPostPage() {
  const router = useRouter();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Title to URL-friendly slug
    const generatedSlug = newTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
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
      setContent((prev) => prev + (prev ? "\n\n" : "") + block + "\n\n");
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
        setContent((prev) => prev + (prev ? "\n\n" : "") + block + "\n\n");
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

      // Redirect to posts list on success
      router.push("/dashboard/posts");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertTemplateBlock = (markdown: string) => {
    setContent((prev) => prev + (prev ? "\n\n" : "") + markdown.trim() + "\n\n");
  };

  return (
    <div className="w-full max-w-[min(100%,1400px)] py-8">
      <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description / Abstract
                </label>
                <Input
                  id="description"
                  placeholder="Brief description of this article (shown in card list, not in article body)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Separate multiple tags with commas
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
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Category path separated by slashes (e.g., LeetCode/Array). Used for note grouping and navigation
                </p>
              </div>

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
                  onSelect={(url) => setContent((prev) => prev + "\n\n![Image](" + url + ")\n\n")}
                />
                <MarkdownTemplateInserter onInsert={insertTemplateBlock} compact />
                <div data-color-mode="light">
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || "")}
                    preview="live"
                    height={600}
                    textareaProps={{
                      placeholder: "Enter post content in Markdown format...",
                      required: true,
                    }}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
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
                <p className="text-xs text-slate-500 mt-2">
                  Use toolbar for quick formatting. You can select multiple images to upload, or drag and drop images here.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 border-slate-600 bg-slate-700"
                />
                <label htmlFor="published" className="text-sm font-medium text-slate-700">
                  Publish immediately
                </label>
              </div>

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
            </form>
          </CardContent>
        </Card>
        <div className="fixed bottom-20 right-4 z-40 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
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
