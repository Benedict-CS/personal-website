"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/media");
        if (res.ok) {
          const data = await res.json();
          setFiles(data);
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

  if (!open) return null;

  const filtered = search.trim()
    ? files.filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : files;

  const handlePick = (file: MediaFile) => {
    onSelect(file.url, file.name);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Insert from Media"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Insert from Media
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="border-b border-slate-100 px-4 py-2">
          <Input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
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
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((file) => (
                <Card
                  key={file.name}
                  className="cursor-pointer overflow-hidden transition hover:ring-2 hover:ring-slate-400"
                  onClick={() => handlePick(file)}
                >
                  <div className="relative aspect-square w-full bg-slate-100">
                    {/\.(jpe?g|png|gif|webp)$/i.test(file.name) ? (
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="truncate text-xs text-slate-700" title={file.name}>
                      {file.name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
