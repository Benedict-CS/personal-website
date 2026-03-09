"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Loader2, Upload } from "lucide-react";

interface MediaFile {
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

type InsertMediaModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, name: string) => void;
};

export function InsertMediaModal({
  open,
  onClose,
  onSelect,
}: InsertMediaModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/media");
        if (res.ok) {
          const data = (await res.json()) as MediaFile[];
          const sorted = [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setFiles(sorted);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const formatSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filtered = search.trim()
    ? files.filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : files;

  const handlePick = (file: MediaFile) => {
    onSelect(file.url, file.name);
    onClose();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      window.alert("Please upload JPEG, PNG, GIF, or WebP images.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      onSelect(data.url, file.name);
      onClose();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[2147483000] isolate" role="dialog" aria-modal="true" aria-label="Insert from Media">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/55"
        onClick={onClose}
        aria-label="Close media dialog"
      />
      <div className="absolute inset-0 flex items-start justify-center p-3 pt-6 pointer-events-none sm:p-4 sm:pt-10">
        <div
          className="pointer-events-auto relative z-[2147483001] flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Insert from Media</h2>
            <p className="text-xs text-slate-500">Choose an existing image or upload a new one.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Input
              type="text"
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:max-w-xs"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 gap-1.5"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload image"}
            </Button>
            <span className="ml-auto text-xs text-slate-500">
              {filtered.length} / {files.length} image{files.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              {files.length === 0
                ? "No media files. Upload images in Media first."
                : "No files match your search."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((file) => (
                <Card
                  key={file.name}
                  className="group cursor-pointer overflow-hidden transition hover:ring-2 hover:ring-slate-400"
                  onClick={() => handlePick(file)}
                >
                  <div className="relative aspect-square w-full bg-slate-100">
                    {/\.(jpe?g|png|gif|webp)$/i.test(file.name) ? (
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs font-medium text-white">Use this image</span>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="truncate text-xs text-slate-700" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatSize(file.size)}{file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
