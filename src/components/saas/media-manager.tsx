"use client";

import { useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Folder = { id: string; name: string; path: string; parentId: string | null };
type Asset = {
  id: string;
  folderId: string | null;
  filename: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function transformImage(file: File, rotateDeg: number, scale: number): Promise<File> {
  const img = await readImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const width = img.width;
  const height = img.height;
  canvas.width = width;
  canvas.height = height;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type || "image/png", 0.92));
  if (!blob) return file;
  return new File([blob], file.name, { type: blob.type });
}

export function MediaManager({ siteId }: { siteId: string }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [rotateDeg, setRotateDeg] = useState(0);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleAssets = useMemo(
    () => assets.filter((a) => (activeFolderId ? a.folderId === activeFolderId : true)),
    [assets, activeFolderId]
  );

  const reload = async () => {
    const [folderRes, assetRes] = await Promise.all([
      fetch(`/api/saas/sites/${siteId}/media/folders`),
      fetch(`/api/saas/sites/${siteId}/media/assets`),
    ]);
    if (folderRes.ok) setFolders(await folderRes.json());
    if (assetRes.ok) setAssets(await assetRes.json());
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    const res = await fetch(`/api/saas/sites/${siteId}/media/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, parentId: activeFolderId }),
    });
    if (res.ok) {
      setFolderName("");
      await reload();
    }
  };

  const renameFolder = async (id: string, name: string) => {
    const next = window.prompt("Rename folder", name);
    if (!next || !next.trim()) return;
    await fetch(`/api/saas/sites/${siteId}/media/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next.trim() }),
    });
    await reload();
  };

  const deleteFolder = async (id: string) => {
    await fetch(`/api/saas/sites/${siteId}/media/folders/${id}`, { method: "DELETE" });
    if (activeFolderId === id) setActiveFolderId(null);
    await reload();
  };

  const deleteAsset = async (id: string) => {
    await fetch(`/api/saas/sites/${siteId}/media/assets/${id}`, { method: "DELETE" });
    await reload();
  };

  const renameAsset = async (asset: Asset) => {
    const next = window.prompt("Rename file", asset.filename);
    if (!next || !next.trim()) return;
    await fetch(`/api/saas/sites/${siteId}/media/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: next.trim() }),
    });
    await reload();
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStatus(`Uploading ${files.length} files...`);

    const list = Array.from(files);
    for (const file of list) {
      try {
        const transformed = await transformImage(file, rotateDeg, scale);
        const fd = new FormData();
        fd.append("file", transformed);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) continue;
        const uploaded = (await uploadRes.json()) as { url: string };
        await fetch(`/api/saas/sites/${siteId}/media/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId: activeFolderId,
            filename: transformed.name,
            mimeType: transformed.type || "image/png",
            sizeBytes: transformed.size,
            storageKey: uploaded.url.split("/").pop() || transformed.name,
            publicUrl: uploaded.url,
            metadata: { rotateDeg, scale, source: "media-manager" },
          }),
        });
      } catch {
        // Continue with the next file to keep bulk upload resilient.
      }
    }

    await reload();
    setStatus("Upload completed.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="New folder name"
          className="w-56"
        />
        <Button variant="outline" onClick={createFolder}>Create Folder</Button>
        <Button variant="outline" onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}>
          View: {viewMode === "grid" ? "Grid" : "List"}
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          Bulk Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*"
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </div>

      <div className="rounded border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold">Image Editor (before upload)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            Rotation ({rotateDeg}deg)
            <input
              type="range"
              min={0}
              max={360}
              value={rotateDeg}
              onChange={(e) => setRotateDeg(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="text-sm">
            Scale ({scale.toFixed(2)}x)
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded border border-border bg-card p-3">
          <h3 className="mb-2 text-sm font-semibold">Folders</h3>
          <button
            type="button"
            className={`mb-2 w-full rounded border px-2 py-1 text-left text-sm ${activeFolderId === null ? "border-blue-500 bg-blue-50" : "border-border"}`}
            onClick={() => setActiveFolderId(null)}
          >
            All assets
          </button>
          <div className="space-y-2">
            {folders.map((f) => (
              <div key={f.id} className="rounded border border-border p-2">
                <button
                  type="button"
                  className={`w-full text-left text-sm ${activeFolderId === f.id ? "font-semibold text-blue-700" : ""}`}
                  onClick={() => setActiveFolderId(f.id)}
                >
                  {f.name}
                </button>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => renameFolder(f.id, f.name)}>Rename</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteFolder(f.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded border border-border bg-card p-3">
          <h3 className="mb-3 text-sm font-semibold">Assets</h3>
          {viewMode === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAssets.map((a) => (
                <div key={a.id} className="rounded border border-border p-2">
                  <NextImage
                    src={a.publicUrl}
                    alt={a.filename}
                    width={640}
                    height={256}
                    className="mb-2 h-32 w-full rounded object-cover"
                  />
                  <div className="truncate text-sm font-medium">{a.filename}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => renameAsset(a)}>Rename</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteAsset(a.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleAssets.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-border p-2">
                  <div className="truncate">
                    <p className="font-medium">{a.filename}</p>
                    <p className="text-xs text-muted-foreground">{a.mimeType} - {Math.round(a.sizeBytes / 1024)} KB</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => renameAsset(a)}>Rename</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteAsset(a.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      <Button variant="outline" onClick={reload}>Refresh</Button>
    </div>
  );
}

