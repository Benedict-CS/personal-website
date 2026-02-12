"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface MediaFile {
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

export default function MediaPage() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  // 載入媒體檔案列表
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

      // 重新載入列表
      await fetchMediaFiles();

      // 3 秒後自動隱藏提示
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

  // 格式化檔案大小
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
    let ok = 0;
    let err = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowed.includes(file.type)) {
        err++;
        continue;
      }
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (res.ok) ok++;
        else err++;
      } catch {
        err++;
      }
    }
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
        </div>
      </div>

      {/* Toast 提示 */}
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
          <CardContent className="py-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 font-medium text-slate-700">No media files yet</p>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Upload images here or drag and drop. Supported: JPEG, PNG, GIF, WebP.
            </p>
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="mt-6 gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload images"}
            </Button>
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
              {uploading ? "Uploading..." : "Upload images"}
            </Button>
          </div>
          {search.trim() && (
            <p className="text-sm text-slate-600">
              {filteredFiles.length === 0
                ? "No files match your search."
                : `Showing ${filteredFiles.length} of ${files.length} files.`}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredFiles.map((file) => (
            <Card key={file.name} className="overflow-hidden">
              <div className="relative aspect-square w-full bg-slate-100">
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>
              <CardContent className="p-3">
                <p className="truncate text-xs font-medium text-slate-900">
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
        </>
      )}
    </div>
  );
}
