"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Image as ImageIcon, Loader2, Upload, Copy, Check } from "lucide-react";
import Image from "next/image";

interface MediaFile {
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

export default function MediaContent() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MEDIA_PAGE_SIZE = 24;

  const toggleSelected = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setDeleteConfirm(false);
    if (selected.size === 0) return;
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteStatus({ show: true, message: data.error || "Delete failed", type: "error" });
        setTimeout(() => setDeleteStatus(null), 3000);
        return;
      }
      setSelected(new Set());
      await fetchMediaFiles();
      setDeleteStatus({ show: true, message: `Deleted ${data.deleted ?? selected.size} file(s).`, type: "success" });
      setTimeout(() => setDeleteStatus(null), 3000);
    } catch {
      setDeleteStatus({ show: true, message: "Delete failed", type: "error" });
      setTimeout(() => setDeleteStatus(null), 3000);
    } finally {
      setDeleting(false);
    }
  };

  const copyUrl = async (url: string, name: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2000);
    } catch {
      setDeleteStatus({ show: true, message: "Copy failed", type: "error" });
      setTimeout(() => setDeleteStatus(null), 2000);
    }
  };

  // Load media list
  const fetchMediaFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/media");
      if (!response.ok) {
        throw new Error("Failed to fetch media files");
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching media files:", error);
      setDeleteStatus({
        show: true,
        message: "Failed to load media files",
        type: "error",
      });
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  useEffect(() => {
    setDisplayLimit(MEDIA_PAGE_SIZE);
  }, [search]);

  const handleCleanup = async () => {
    setShowCleanupConfirm(false);
    try {
      setIsCleaning(true);
      const response = await fetch("/api/media/cleanup", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clean up media files");
      }

      const data = await response.json();
      setDeleteStatus({
        show: true,
        message: `Successfully cleaned up ${data.deletedCount} unused image${data.deletedCount !== 1 ? "s" : ""}`,
        type: "success",
      });

      // Reload list
      await fetchMediaFiles();

      // Hide toast after 3s
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Error cleaning up media files:", error);
      setDeleteStatus({
        show: true,
        message: "Cleanup failed",
        type: "error",
      });
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    } finally {
      setIsCleaning(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    setDeleteStatus(null);
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const toUpload = Array.from(fileList).filter((f) => allowed.includes(f.type));
    const total = toUpload.length;
    let ok = 0;
    let err = toUpload.length === 0 ? fileList.length : 0;
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      setUploadProgress({ current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
      try {
        const result = await new Promise<boolean>((resolve) => {
          const form = new FormData();
          form.append("file", file);
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = total > 1 ? (i + e.loaded / e.total) / total : e.loaded / e.total;
              setUploadProgress({ current: i + 1, total, percent: Math.round(pct * 100) });
            }
          });
          xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
          xhr.addEventListener("error", () => resolve(false));
          xhr.open("POST", "/api/upload");
          xhr.send(form);
        });
        if (result) ok++;
        else err++;
      } catch {
        err++;
      }
    }
    setUploadProgress(null);
    setUploading(false);
    if (ok > 0) await fetchMediaFiles();
    setDeleteStatus({
      show: true,
      message: ok > 0 ? `Uploaded ${ok} image(s).${err ? ` ${err} failed.` : ""}` : err > 0 ? "Upload failed. Only JPEG, PNG, GIF, WebP are allowed." : "No files to upload.",
      type: ok > 0 ? "success" : "error",
    });
    setTimeout(() => setDeleteStatus(null), 4000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const filteredFiles = search.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : files;
  const visibleFiles = filteredFiles.slice(0, displayLimit);
  const hasMore = filteredFiles.length > displayLimit;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={showCleanupConfirm}
        onClose={() => setShowCleanupConfirm(false)}
        title="Clean unused images"
        description="Remove all images that are not referenced in any post or content. This cannot be undone."
        confirmLabel="Clean up"
        variant="danger"
        loading={isCleaning}
        onConfirm={handleCleanup}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900">Media</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload images
              </>
            )}
          </Button>
          <Input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[200px]"
          />
          <Button
            onClick={() => setShowCleanupConfirm(true)}
            disabled={isCleaning}
            variant="destructive"
            className="gap-2"
          >
            {isCleaning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Clean Unused Images
              </>
            )}
          </Button>
          {files.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={selected.size === 0 || deleting}
              onClick={() => setDeleteConfirm(true)}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete selected {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete selected files"
        description={`Permanently delete ${selected.size} file(s)? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleBulkDelete}
      />

      {!isLoading && (
        <p className="text-sm text-slate-600">
          {files.length} file{files.length !== 1 ? "s" : ""}
          {files.length > 0 && (
            <> · {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))} total</>
          )}
        </p>
      )}

      {/* Toast */}
      {deleteStatus?.show && (
        <div
          className={`rounded-lg border p-4 ${
            deleteStatus.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p>{deleteStatus.message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square w-full bg-slate-200" />
              <CardContent className="p-3">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragOver ? "border-slate-400 bg-slate-50" : "border-slate-200"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ImageIcon className="h-10 w-10 text-slate-500" />
            </div>
            <p className="mt-6 text-lg font-medium text-slate-800">No media files yet</p>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Upload images to use in posts, or drag and drop here. Supported: JPEG, PNG, GIF, WebP.
            </p>
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="mt-6 gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading
                ? (uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total} (${uploadProgress.percent}%)` : "Uploading...")
                : "Upload images"}
            </Button>
            {uploading && uploadProgress && (
              <div className="mt-4 w-full max-w-sm mx-auto h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragOver ? "border-slate-400 bg-slate-50" : "border-slate-200"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <p className="text-sm text-slate-600">Drag and drop images here, or</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading
                ? (uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total} (${uploadProgress.percent}%)` : "Uploading...")
                : "Upload images"}
            </Button>
            {uploading && uploadProgress && (
              <div className="mt-2 w-full max-w-xs h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            )}
          </div>
          {search.trim() && (
            <p className="text-sm text-slate-600">
              {filteredFiles.length === 0
                ? "No files match your search."
                : `Showing ${visibleFiles.length} of ${filteredFiles.length} (${files.length} total).`}
            </p>
          )}
          {!search.trim() && files.length > MEDIA_PAGE_SIZE && (
            <p className="text-sm text-slate-600">
              Showing {visibleFiles.length} of {filteredFiles.length} files.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleFiles.map((file) => (
            <Card key={file.name} className={`overflow-hidden transition-shadow hover:shadow-md ${selected.has(file.name) ? "ring-2 ring-primary" : ""}`}>
              <div className="relative aspect-square w-full bg-slate-100 group">
                <button
                  type="button"
                  onClick={() => toggleSelected(file.name)}
                  className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border bg-white shadow"
                  aria-label={selected.has(file.name) ? "Deselect" : "Select"}
                >
                  {selected.has(file.name) ? (
                    <span className="text-xs font-bold text-primary">✓</span>
                  ) : null}
                </button>
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 shadow-lg"
                    onClick={() => copyUrl(file.url, file.name)}
                  >
                    {copiedName === file.name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedName === file.name ? "Copied" : "Copy URL"}
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="truncate text-xs font-medium text-slate-900" title={file.name}>
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(file.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit((n) => n + MEDIA_PAGE_SIZE)}
              >
                Load more ({filteredFiles.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
