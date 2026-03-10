"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download, Upload } from "lucide-react";

export function DashboardExportImport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1]
        ?? `export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: data.posts ?? [],
          customPages: data.customPages ?? [],
        }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Import failed");
      setImportResult(result.created ?? "Import complete.");
      if (result.errors?.length) {
        setImportResult((prev) => `${prev} Errors: ${result.errors.join("; ")}`);
      }
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Card className="min-w-[140px]">
        <CardContent className="pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting…" : "Export posts"}
          </Button>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Download posts and custom pages as JSON. Use Import posts to restore.</p>
        </CardContent>
      </Card>
      <Card className="min-w-[140px]">
        <CardContent className="pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing…" : "Import posts"}
          </Button>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Upload a JSON file from Export posts to create posts and pages.</p>
          {importResult && <p className="mt-2 text-xs text-[var(--foreground)] line-clamp-3">{importResult}</p>}
        </CardContent>
      </Card>
    </>
  );
}
