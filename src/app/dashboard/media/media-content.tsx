"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

type OptimizeResult = {
  key: string;
  originalBytes: number;
  optimizedBytes: number;
  savedBytes: number;
  status: "optimized" | "skipped" | "failed";
  error?: string;
};

type OptimizeCandidate = {
  key: string;
  sizeBytes: number;
  estimatedSavedBytes: number;
};

type OptimizeSummary = {
  dryRun: boolean;
  minBytes: number;
  candidateCount: number;
  estimatedSavedBytes: number;
  executed?: number;
  optimizedCount?: number;
  savedBytesTotal?: number;
  maxItems?: number;
  note?: string;
  requestedCount?: number;
  candidates?: OptimizeCandidate[];
  results?: OptimizeResult[];
};

function classifyErrorCategory(error?: string): string {
  const msg = (error || "").toLowerCase();
  if (!msg) return "unknown";
  if (msg.includes("input") || msg.includes("decode") || msg.includes("corrupt")) return "decode";
  if (msg.includes("format") || msg.includes("unsupported")) return "format";
  if (msg.includes("permission") || msg.includes("access denied") || msg.includes("forbidden")) return "permission";
  if (msg.includes("timeout") || msg.includes("network") || msg.includes("socket")) return "network";
  if (msg.includes("not found") || msg.includes("no such key")) return "missing";
  return "other";
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: string): string {
  const safe = value.replace(/"/g, "\"\"");
  return `"${safe}"`;
}

function getDeltaTrend(delta: { candidateDelta: number; estimatedSavedBytesDelta: number }): "improved" | "regressed" | "mixed" | "unchanged" {
  if (delta.candidateDelta === 0 && delta.estimatedSavedBytesDelta === 0) return "unchanged";
  if (delta.candidateDelta < 0 && delta.estimatedSavedBytesDelta < 0) return "improved";
  if (delta.candidateDelta > 0 && delta.estimatedSavedBytesDelta > 0) return "regressed";
  return "mixed";
}

const MEDIA_OPTIMIZE_SORT_PREF_KEY = "media-optimize-sort-pref-v1";
const MEDIA_OPTIMIZE_FILTER_PREF_KEY = "media-optimize-filter-pref-v1";
const MEDIA_OPTIMIZE_RUN_PREF_KEY = "media-optimize-run-pref-v1";
const DEFAULT_OPTIMIZE_MIN_BYTES = 250000;
const DEFAULT_OPTIMIZE_MAX_ITEMS = 10;
const DEFAULT_OPTIMIZE_ERROR_FILTER = "all";

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
  const [isAssessingOptimize, setIsAssessingOptimize] = useState(false);
  const [isRunningOptimize, setIsRunningOptimize] = useState(false);
  const [isRunningBatchOptimize, setIsRunningBatchOptimize] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedKeys, setFailedKeys] = useState<string[]>([]);
  const [optimizeMinBytes, setOptimizeMinBytes] = useState(DEFAULT_OPTIMIZE_MIN_BYTES);
  const [optimizeMaxItems, setOptimizeMaxItems] = useState(DEFAULT_OPTIMIZE_MAX_ITEMS);
  const [showOnlyCandidates, setShowOnlyCandidates] = useState(false);
  const [showOnlyFailedResults, setShowOnlyFailedResults] = useState(false);
  const [errorFilter, setErrorFilter] = useState<string>(DEFAULT_OPTIMIZE_ERROR_FILTER);
  const [resultSortBy, setResultSortBy] = useState<"rank" | "savedBytes" | "name">("rank");
  const [resultSortDir, setResultSortDir] = useState<"asc" | "desc">("asc");
  const [expandedFailedKeys, setExpandedFailedKeys] = useState<Set<string>>(new Set());
  const [copiedFailedKeysAt, setCopiedFailedKeysAt] = useState<number | null>(null);
  const [lastAssessmentRefreshedAt, setLastAssessmentRefreshedAt] = useState<string | null>(null);
  const [assessmentRefreshStatus, setAssessmentRefreshStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [assessmentDelta, setAssessmentDelta] = useState<{
    candidateDelta: number;
    estimatedSavedBytesDelta: number;
  } | null>(null);
  const [optimizeSummary, setOptimizeSummary] = useState<OptimizeSummary | null>(null);
  const batchCancelRef = useRef(false);
  const assessmentRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAssessmentSnapshotRef = useRef<{
    candidateCount: number;
    estimatedSavedBytes: number;
  } | null>(null);
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
      const response = await fetch("/api/media", { credentials: "include" });
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEDIA_OPTIMIZE_SORT_PREF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        sortBy?: "rank" | "savedBytes" | "name";
        sortDir?: "asc" | "desc";
      };
      if (parsed.sortBy === "rank" || parsed.sortBy === "savedBytes" || parsed.sortBy === "name") {
        setResultSortBy(parsed.sortBy);
      }
      if (parsed.sortDir === "asc" || parsed.sortDir === "desc") {
        setResultSortDir(parsed.sortDir);
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        MEDIA_OPTIMIZE_SORT_PREF_KEY,
        JSON.stringify({
          sortBy: resultSortBy,
          sortDir: resultSortDir,
        })
      );
    } catch {
      // Ignore storage write failures.
    }
  }, [resultSortBy, resultSortDir]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEDIA_OPTIMIZE_FILTER_PREF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        showOnlyFailedResults?: boolean;
        showOnlyCandidates?: boolean;
        errorFilter?: string;
      };
      if (typeof parsed.showOnlyFailedResults === "boolean") {
        setShowOnlyFailedResults(parsed.showOnlyFailedResults);
      }
      if (typeof parsed.showOnlyCandidates === "boolean") {
        setShowOnlyCandidates(parsed.showOnlyCandidates);
      }
      if (typeof parsed.errorFilter === "string" && parsed.errorFilter.trim().length > 0) {
        setErrorFilter(parsed.errorFilter);
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        MEDIA_OPTIMIZE_FILTER_PREF_KEY,
        JSON.stringify({
          showOnlyFailedResults,
          showOnlyCandidates,
          errorFilter,
        })
      );
    } catch {
      // Ignore storage write failures.
    }
  }, [showOnlyFailedResults, showOnlyCandidates, errorFilter]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEDIA_OPTIMIZE_RUN_PREF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        optimizeMinBytes?: number;
        optimizeMaxItems?: number;
      };
      if (Number.isFinite(parsed.optimizeMinBytes)) {
        setOptimizeMinBytes(Math.max(50000, Number(parsed.optimizeMinBytes)));
      }
      if (Number.isFinite(parsed.optimizeMaxItems)) {
        setOptimizeMaxItems(Math.min(25, Math.max(1, Number(parsed.optimizeMaxItems))));
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        MEDIA_OPTIMIZE_RUN_PREF_KEY,
        JSON.stringify({
          optimizeMinBytes,
          optimizeMaxItems,
        })
      );
    } catch {
      // Ignore storage write failures.
    }
  }, [optimizeMinBytes, optimizeMaxItems]);

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

  const requestOptimize = async (payload: {
    dryRun: boolean;
    minBytes: number;
    maxItems: number;
    keys?: string[];
  }): Promise<OptimizeSummary> => {
    const response = await fetch("/api/media/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as OptimizeSummary & { error?: string };
    if (!response.ok) throw new Error(data.error || "Optimize request failed");
    return data;
  };

  const refreshOptimizeAssessment = async (): Promise<boolean> => {
    setAssessmentRefreshStatus("running");
    try {
      const assessment = await requestOptimize({
        dryRun: true,
        minBytes: optimizeMinBytes,
        maxItems: optimizeMaxItems,
      });
      setOptimizeSummary((prev) => {
        if (!prev) return assessment;
        return {
          ...prev,
          minBytes: assessment.minBytes,
          candidateCount: assessment.candidateCount,
          estimatedSavedBytes: assessment.estimatedSavedBytes,
          candidates: assessment.candidates,
        };
      });
      const previousSnapshot = lastAssessmentSnapshotRef.current;
      if (previousSnapshot) {
        setAssessmentDelta({
          candidateDelta: assessment.candidateCount - previousSnapshot.candidateCount,
          estimatedSavedBytesDelta: assessment.estimatedSavedBytes - previousSnapshot.estimatedSavedBytes,
        });
      } else {
        setAssessmentDelta(null);
      }
      lastAssessmentSnapshotRef.current = {
        candidateCount: assessment.candidateCount,
        estimatedSavedBytes: assessment.estimatedSavedBytes,
      };
      setLastAssessmentRefreshedAt(new Date().toISOString());
      setAssessmentRefreshStatus("success");
      return true;
    } catch {
      // Keep previous summary when refresh fails.
      setAssessmentRefreshStatus("error");
      return false;
    }
  };

  const scheduleAssessmentRefresh = () => {
    if (assessmentRefreshTimerRef.current) clearTimeout(assessmentRefreshTimerRef.current);
    assessmentRefreshTimerRef.current = setTimeout(() => {
      void refreshOptimizeAssessment();
    }, 600);
  };

  const runOptimize = async (dryRun: boolean) => {
    if (dryRun) setIsAssessingOptimize(true);
    else setIsRunningOptimize(true);
    setDeleteStatus(null);
    try {
      const data = await requestOptimize({
        dryRun,
        minBytes: optimizeMinBytes,
        maxItems: optimizeMaxItems,
      });
      setOptimizeSummary(data);
      if (!dryRun) {
        setFailedKeys((data.results ?? []).filter((r) => r.status === "failed").map((r) => r.key));
      }
      if (!dryRun) {
        await fetchMediaFiles();
        scheduleAssessmentRefresh();
      }
      setDeleteStatus({
        show: true,
        message: dryRun
          ? `Assessment complete: ${data.candidateCount ?? 0} candidate(s).`
          : `Optimize run complete: ${data.optimizedCount ?? 0} optimized.`,
        type: "success",
      });
      setTimeout(() => setDeleteStatus(null), 3500);
    } catch (error) {
      setDeleteStatus({
        show: true,
        message: error instanceof Error ? error.message : "Optimize failed",
        type: "error",
      });
      setTimeout(() => setDeleteStatus(null), 3500);
    } finally {
      setIsAssessingOptimize(false);
      setIsRunningOptimize(false);
    }
  };

  const runBatchOptimizeAll = async () => {
    setIsRunningBatchOptimize(true);
    setBatchProgress(null);
    setDeleteStatus(null);
    batchCancelRef.current = false;
    try {
      const assessment =
        optimizeSummary?.candidates && optimizeSummary.candidates.length > 0
          ? optimizeSummary
          : await requestOptimize({
              dryRun: true,
              minBytes: optimizeMinBytes,
              maxItems: optimizeMaxItems,
            });
      const keys = (assessment.candidates ?? []).map((c) => c.key);
      if (keys.length === 0) {
        setOptimizeSummary(assessment);
        setDeleteStatus({ show: true, message: "No optimize candidates found.", type: "success" });
        setTimeout(() => setDeleteStatus(null), 3000);
        return;
      }
      const chunks = Math.ceil(keys.length / optimizeMaxItems);
      const allResults: OptimizeResult[] = [];
      let optimizedCount = 0;
      let savedBytesTotal = 0;
      let cancelled = false;
      for (let i = 0; i < chunks; i++) {
        if (batchCancelRef.current) {
          cancelled = true;
          break;
        }
        const chunkKeys = keys.slice(i * optimizeMaxItems, (i + 1) * optimizeMaxItems);
        setBatchProgress({ current: i + 1, total: chunks });
        const run = await requestOptimize({
          dryRun: false,
          minBytes: optimizeMinBytes,
          maxItems: chunkKeys.length,
          keys: chunkKeys,
        });
        allResults.push(...(run.results ?? []));
        optimizedCount += run.optimizedCount ?? 0;
        savedBytesTotal += run.savedBytesTotal ?? 0;
      }
      const nextFailedKeys = allResults.filter((r) => r.status === "failed").map((r) => r.key);
      setFailedKeys(nextFailedKeys);
      setOptimizeSummary({
        ...assessment,
        dryRun: false,
        executed: allResults.length,
        optimizedCount,
        savedBytesTotal,
        results: allResults,
        note: cancelled
          ? "Batch optimize cancelled. You can retry failed items or rerun all."
          : "Batch optimize completed for all current candidates.",
      });
      await fetchMediaFiles();
      scheduleAssessmentRefresh();
      setDeleteStatus({
        show: true,
        message: cancelled
          ? `Batch stopped: processed ${allResults.length}/${keys.length}, saved ${formatFileSize(savedBytesTotal)}.`
          : `Batch optimize complete: ${optimizedCount} optimized, saved ${formatFileSize(savedBytesTotal)}.`,
        type: "success",
      });
      setTimeout(() => setDeleteStatus(null), 4000);
    } catch (error) {
      setDeleteStatus({
        show: true,
        message: error instanceof Error ? error.message : "Batch optimize failed",
        type: "error",
      });
      setTimeout(() => setDeleteStatus(null), 4000);
    } finally {
      setIsRunningBatchOptimize(false);
      setBatchProgress(null);
      batchCancelRef.current = false;
    }
  };

  const stopBatchOptimize = () => {
    batchCancelRef.current = true;
  };

  const resetOptimizePanelPreferences = () => {
    setShowOnlyFailedResults(false);
    setShowOnlyCandidates(false);
    setErrorFilter(DEFAULT_OPTIMIZE_ERROR_FILTER);
    setResultSortBy("rank");
    setResultSortDir("asc");
    setOptimizeMinBytes(DEFAULT_OPTIMIZE_MIN_BYTES);
    setOptimizeMaxItems(DEFAULT_OPTIMIZE_MAX_ITEMS);
    setExpandedFailedKeys(new Set());
    setCopiedFailedKeysAt(null);
    try {
      localStorage.removeItem(MEDIA_OPTIMIZE_SORT_PREF_KEY);
      localStorage.removeItem(MEDIA_OPTIMIZE_FILTER_PREF_KEY);
      localStorage.removeItem(MEDIA_OPTIMIZE_RUN_PREF_KEY);
    } catch {
      // Ignore storage write failures.
    }
    setDeleteStatus({
      show: true,
      message: "Optimize panel preferences reset to defaults.",
      type: "success",
    });
    setTimeout(() => setDeleteStatus(null), 2200);
  };

  const toggleFailedResultExpanded = (key: string) => {
    setExpandedFailedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyFailedKeys = async () => {
    const keys = (optimizeSummary?.results ?? [])
      .filter((result) => result.status === "failed")
      .map((result) => result.key);
    if (keys.length === 0) return;
    try {
      await navigator.clipboard.writeText(keys.join("\n"));
      setCopiedFailedKeysAt(Date.now());
      setTimeout(() => setCopiedFailedKeysAt(null), 2000);
      setDeleteStatus({
        show: true,
        message: `Copied ${keys.length} failed key(s) to clipboard.`,
        type: "success",
      });
      setTimeout(() => setDeleteStatus(null), 2500);
    } catch {
      setDeleteStatus({
        show: true,
        message: "Failed to copy failed keys.",
        type: "error",
      });
      setTimeout(() => setDeleteStatus(null), 2500);
    }
  };

  const exportFailedJson = () => {
    if (failedResults.length === 0) return;
    const trend = assessmentDelta ? getDeltaTrend(assessmentDelta) : "unchanged";
    const errorRank = Array.from(
      failedResults.reduce((map, result) => {
        const category = classifyErrorCategory(result.error);
        const current = map.get(category) ?? { count: 0, impactBytes: 0 };
        map.set(category, {
          count: current.count + 1,
          impactBytes: current.impactBytes + Math.max(0, result.originalBytes),
        });
        return map;
      }, new Map<string, { count: number; impactBytes: number }>())
    )
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.count - a.count || b.impactBytes - a.impactBytes);
    const rankByCategory = new Map(errorRank.map((item, idx) => [item.category, idx + 1]));
    const payload = {
      exportedAt: new Date().toISOString(),
      count: failedResults.length,
      snapshot: {
        trend,
        candidateDelta: assessmentDelta?.candidateDelta ?? 0,
        estimatedSavedBytesDelta: assessmentDelta?.estimatedSavedBytesDelta ?? 0,
        lastAssessmentRefreshedAt,
      },
      errorRank,
      items: failedResults.map((result) => ({
        key: result.key,
        category: classifyErrorCategory(result.error),
        errorRank: rankByCategory.get(classifyErrorCategory(result.error)) ?? null,
        originalBytes: result.originalBytes,
        optimizedBytes: result.optimizedBytes,
        savedBytes: result.savedBytes,
        error: result.error || "",
      })),
    };
    downloadTextFile(
      `media-optimize-failed-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const exportFailedCsv = () => {
    if (failedResults.length === 0) return;
    const trend = assessmentDelta ? getDeltaTrend(assessmentDelta) : "unchanged";
    const errorRank = Array.from(
      failedResults.reduce((map, result) => {
        const category = classifyErrorCategory(result.error);
        const current = map.get(category) ?? { count: 0, impactBytes: 0 };
        map.set(category, {
          count: current.count + 1,
          impactBytes: current.impactBytes + Math.max(0, result.originalBytes),
        });
        return map;
      }, new Map<string, { count: number; impactBytes: number }>())
    )
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.count - a.count || b.impactBytes - a.impactBytes);
    const rankByCategory = new Map(errorRank.map((item, idx) => [item.category, idx + 1]));
    const header = [
      "key",
      "category",
      "errorRank",
      "trend",
      "candidateDelta",
      "estimatedSavedBytesDelta",
      "originalBytes",
      "optimizedBytes",
      "savedBytes",
      "error",
    ];
    const rows = failedResults.map((result) => [
      result.key,
      classifyErrorCategory(result.error),
      String(rankByCategory.get(classifyErrorCategory(result.error)) ?? ""),
      trend,
      String(assessmentDelta?.candidateDelta ?? 0),
      String(assessmentDelta?.estimatedSavedBytesDelta ?? 0),
      String(result.originalBytes),
      String(result.optimizedBytes),
      String(result.savedBytes),
      result.error || "",
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => toCsvCell(cell)).join(","))
      .join("\n");
    downloadTextFile(
      `media-optimize-failed-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  const failedResults = useMemo(
    () => (optimizeSummary?.results ?? []).filter((result) => result.status === "failed"),
    [optimizeSummary]
  );

  const failedCategoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; impactBytes: number }>();
    for (const result of failedResults) {
      const category = classifyErrorCategory(result.error);
      const current = stats.get(category) ?? { count: 0, impactBytes: 0 };
      stats.set(category, {
        count: current.count + 1,
        // Use original size as blocked optimization volume for failed items.
        impactBytes: current.impactBytes + Math.max(0, result.originalBytes),
      });
    }
    return Array.from(stats.entries())
      .map(([category, values]) => ({
        category,
        count: values.count,
        impactBytes: values.impactBytes,
        rank: 0,
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [failedResults]);

  const failedRankByCategory = useMemo(
    () => new Map(failedCategoryStats.map((item) => [item.category, item.rank])),
    [failedCategoryStats]
  );
  const failedCategoryMetaByName = useMemo(
    () => new Map(failedCategoryStats.map((item) => [item.category, item])),
    [failedCategoryStats]
  );

  const visibleOptimizeResults = useMemo(() => {
    const source = optimizeSummary?.results ?? [];
    const failedScoped = showOnlyFailedResults
      ? source.filter((result) => result.status === "failed")
      : source;
    const filtered = failedScoped.filter((result) => {
      if (errorFilter === DEFAULT_OPTIMIZE_ERROR_FILTER) return true;
      if (result.status !== "failed") return false;
      return classifyErrorCategory(result.error) === errorFilter;
    });
    return [...filtered].sort((a, b) => {
      const direction = resultSortDir === "asc" ? 1 : -1;
      if (resultSortBy === "name") {
        return a.key.localeCompare(b.key) * direction;
      }
      if (resultSortBy === "savedBytes") {
        return (a.savedBytes - b.savedBytes) * direction;
      }
      const rankA =
        a.status === "failed" ? (failedRankByCategory.get(classifyErrorCategory(a.error)) ?? 9999) : 9999;
      const rankB =
        b.status === "failed" ? (failedRankByCategory.get(classifyErrorCategory(b.error)) ?? 9999) : 9999;
      if (rankA !== rankB) return (rankA - rankB) * direction;
      return (b.savedBytes - a.savedBytes) * direction;
    });
  }, [
    optimizeSummary,
    showOnlyFailedResults,
    errorFilter,
    resultSortBy,
    resultSortDir,
    failedRankByCategory,
  ]);

  const retryFailedOnly = async () => {
    if (failedKeys.length === 0) return;
    setIsRunningBatchOptimize(true);
    setDeleteStatus(null);
    setBatchProgress(null);
    batchCancelRef.current = false;
    try {
      const keys = [...failedKeys];
      const chunks = Math.ceil(keys.length / optimizeMaxItems);
      const retryResults: OptimizeResult[] = [];
      let optimizedCount = 0;
      let savedBytesTotal = 0;
      let cancelled = false;
      for (let i = 0; i < chunks; i++) {
        if (batchCancelRef.current) {
          cancelled = true;
          break;
        }
        const chunkKeys = keys.slice(i * optimizeMaxItems, (i + 1) * optimizeMaxItems);
        setBatchProgress({ current: i + 1, total: chunks });
        const run = await requestOptimize({
          dryRun: false,
          minBytes: optimizeMinBytes,
          maxItems: chunkKeys.length,
          keys: chunkKeys,
        });
        retryResults.push(...(run.results ?? []));
        optimizedCount += run.optimizedCount ?? 0;
        savedBytesTotal += run.savedBytesTotal ?? 0;
      }
      const stillFailed = retryResults.filter((r) => r.status === "failed").map((r) => r.key);
      setFailedKeys(stillFailed);
      setOptimizeSummary((prev) => {
        if (!prev) return prev;
        const previousNonFailed = (prev.results ?? []).filter((r) => !keys.includes(r.key));
        return {
          ...prev,
          dryRun: false,
          executed: previousNonFailed.length + retryResults.length,
          optimizedCount: (prev.optimizedCount ?? 0) + optimizedCount,
          savedBytesTotal: (prev.savedBytesTotal ?? 0) + savedBytesTotal,
          results: [...previousNonFailed, ...retryResults],
          note: cancelled
            ? "Retry failed-only cancelled."
            : stillFailed.length > 0
              ? `Retry finished with ${stillFailed.length} still failing.`
              : "Retry failed-only completed successfully.",
        };
      });
      await fetchMediaFiles();
      scheduleAssessmentRefresh();
      setDeleteStatus({
        show: true,
        message: cancelled
          ? "Retry cancelled."
          : stillFailed.length > 0
            ? `Retry done: ${stillFailed.length} failed item(s) remain.`
            : `Retry done: all failed items recovered, saved ${formatFileSize(savedBytesTotal)}.`,
        type: "success",
      });
      setTimeout(() => setDeleteStatus(null), 4000);
    } catch (error) {
      setDeleteStatus({
        show: true,
        message: error instanceof Error ? error.message : "Retry failed-only failed",
        type: "error",
      });
      setTimeout(() => setDeleteStatus(null), 4000);
    } finally {
      setIsRunningBatchOptimize(false);
      setBatchProgress(null);
      batchCancelRef.current = false;
    }
  };

  const candidateKeySet = new Set((optimizeSummary?.candidates ?? []).map((c) => c.key));
  const filteredFilesBase = search.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : files;
  const filteredFiles =
    showOnlyCandidates && candidateKeySet.size > 0
      ? filteredFilesBase.filter((f) => candidateKeySet.has(f.name))
      : filteredFilesBase;
  const visibleFiles = filteredFiles.slice(0, displayLimit);
  const hasMore = filteredFiles.length > displayLimit;

  useEffect(() => {
    return () => {
      if (assessmentRefreshTimerRef.current) clearTimeout(assessmentRefreshTimerRef.current);
    };
  }, []);

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
            type="button"
            variant={showOnlyCandidates ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyCandidates((prev) => !prev)}
            disabled={candidateKeySet.size === 0}
          >
            Candidate only {candidateKeySet.size > 0 ? `(${candidateKeySet.size})` : ""}
          </Button>
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

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-600">
              Min size (bytes)
              <Input
                type="number"
                min={50000}
                step={10000}
                value={optimizeMinBytes}
                onChange={(e) => setOptimizeMinBytes(Math.max(50000, Number(e.target.value || 0)))}
                className="mt-1 w-[170px]"
              />
            </label>
            <label className="text-xs text-slate-600">
              Max items per run
              <Input
                type="number"
                min={1}
                max={25}
                value={optimizeMaxItems}
                onChange={(e) => setOptimizeMaxItems(Math.min(25, Math.max(1, Number(e.target.value || 1))))}
                className="mt-1 w-[150px]"
              />
            </label>
            <Button
              variant="outline"
              onClick={() => runOptimize(true)}
              disabled={isAssessingOptimize || isRunningOptimize || isRunningBatchOptimize}
            >
              {isAssessingOptimize ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assess optimize
            </Button>
            <Button
              variant="outline"
              onClick={() => void refreshOptimizeAssessment()}
              disabled={
                isAssessingOptimize ||
                isRunningOptimize ||
                isRunningBatchOptimize ||
                assessmentRefreshStatus === "running"
              }
            >
              {assessmentRefreshStatus === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh candidates
            </Button>
            <Button
              variant="outline"
              onClick={resetOptimizePanelPreferences}
              disabled={isAssessingOptimize || isRunningOptimize || isRunningBatchOptimize}
            >
              Reset panel preferences
            </Button>
            <Button
              onClick={() => runOptimize(false)}
              disabled={isAssessingOptimize || isRunningOptimize || isRunningBatchOptimize}
            >
              {isRunningOptimize ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run optimize
            </Button>
            <Button
              variant="outline"
              onClick={runBatchOptimizeAll}
              disabled={isAssessingOptimize || isRunningOptimize || isRunningBatchOptimize}
            >
              {isRunningBatchOptimize ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run optimize all (batched)
            </Button>
            <Button
              variant="outline"
              onClick={retryFailedOnly}
              disabled={isAssessingOptimize || isRunningOptimize || isRunningBatchOptimize || failedKeys.length === 0}
            >
              Retry failed only {failedKeys.length > 0 ? `(${failedKeys.length})` : ""}
            </Button>
            <Button
              variant="destructive"
              onClick={stopBatchOptimize}
              disabled={!isRunningBatchOptimize}
            >
              Stop batch
            </Button>
          </div>
          {batchProgress ? (
            <p className="text-xs text-slate-600">
              Batch progress: {batchProgress.current}/{batchProgress.total}
            </p>
          ) : null}
          {lastAssessmentRefreshedAt ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500">
                Candidates auto-refreshed at {new Date(lastAssessmentRefreshedAt).toLocaleTimeString()}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  assessmentRefreshStatus === "success"
                    ? "bg-green-100 text-green-800"
                    : assessmentRefreshStatus === "error"
                      ? "bg-red-100 text-red-800"
                      : assessmentRefreshStatus === "running"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                }`}
              >
                {assessmentRefreshStatus === "success"
                  ? "Refresh OK"
                  : assessmentRefreshStatus === "error"
                    ? "Refresh failed"
                    : assessmentRefreshStatus === "running"
                      ? "Refreshing"
                      : "Refresh idle"}
              </span>
              {assessmentDelta ? (
                (() => {
                  const trend = getDeltaTrend(assessmentDelta);
                  const trendLabel =
                    trend === "improved"
                      ? "Improved"
                      : trend === "regressed"
                        ? "Regressed"
                        : trend === "unchanged"
                          ? "Unchanged"
                          : "Mixed";
                  return (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    trend === "unchanged"
                      ? "bg-slate-100 text-slate-700"
                      : trend === "improved"
                        ? "bg-green-100 text-green-800"
                        : trend === "regressed"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {trendLabel} ·{" "}
                  Since last snapshot: candidates {assessmentDelta.candidateDelta > 0 ? "+" : ""}
                  {assessmentDelta.candidateDelta}
                  {" · "}
                  est save {assessmentDelta.estimatedSavedBytesDelta > 0 ? "+" : assessmentDelta.estimatedSavedBytesDelta < 0 ? "-" : ""}
                  {formatFileSize(Math.abs(assessmentDelta.estimatedSavedBytesDelta))}
                </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          {optimizeSummary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Candidates: <span className="font-medium">{optimizeSummary.candidateCount}</span>
                {" · "}
                Estimated save: <span className="font-medium">{formatFileSize(optimizeSummary.estimatedSavedBytes)}</span>
                {!optimizeSummary.dryRun ? (
                  <>
                    {" · "}
                    Optimized: <span className="font-medium">{optimizeSummary.optimizedCount ?? 0}</span>
                    {" · "}
                    Actual saved: <span className="font-medium">{formatFileSize(optimizeSummary.savedBytesTotal ?? 0)}</span>
                  </>
                ) : null}
              </p>
              {optimizeSummary.note ? (
                <p className="mt-1 text-xs text-slate-500">{optimizeSummary.note}</p>
              ) : null}
              {Array.isArray(optimizeSummary.results) && optimizeSummary.results.length > 0 ? (
                <div className="mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={showOnlyFailedResults ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowOnlyFailedResults((prev) => !prev)}
                    >
                      Failed only ({failedResults.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyFailedKeys}
                      disabled={failedResults.length === 0}
                    >
                      {copiedFailedKeysAt ? "Failed keys copied" : "Copy failed keys"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportFailedJson}
                      disabled={failedResults.length === 0}
                    >
                      Export failed JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportFailedCsv}
                      disabled={failedResults.length === 0}
                    >
                      Export failed CSV
                    </Button>
                    <Button
                      type="button"
                      variant={errorFilter === DEFAULT_OPTIMIZE_ERROR_FILTER ? "default" : "outline"}
                      size="sm"
                      onClick={() => setErrorFilter(DEFAULT_OPTIMIZE_ERROR_FILTER)}
                    >
                      All errors
                    </Button>
                    <Button
                      type="button"
                      variant={resultSortBy === "rank" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultSortBy("rank")}
                    >
                      Sort: rank
                    </Button>
                    <Button
                      type="button"
                      variant={resultSortBy === "savedBytes" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultSortBy("savedBytes")}
                    >
                      Sort: saved
                    </Button>
                    <Button
                      type="button"
                      variant={resultSortBy === "name" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultSortBy("name")}
                    >
                      Sort: name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResultSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                    >
                      {resultSortDir === "asc" ? "Asc" : "Desc"}
                    </Button>
                    {failedCategoryStats.map((item) => (
                      <Button
                        key={item.category}
                        type="button"
                        variant={errorFilter === item.category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setErrorFilter(item.category)}
                      >
                        #{item.rank} {item.category} ({item.count}) · {formatFileSize(item.impactBytes)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {Array.isArray(optimizeSummary.results) && optimizeSummary.results.length > 0 ? (
                <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-200 bg-white p-2">
                  {visibleOptimizeResults.length === 0 ? (
                    <p className="text-xs text-slate-500">No results for current error filter.</p>
                  ) : null}
                  {visibleOptimizeResults.slice(0, 30).map((result) => (
                      <div key={result.key} className="mb-1 border-b border-slate-100 pb-1 last:mb-0 last:border-0 last:pb-0">
                        <p className="text-xs text-slate-600">
                          {result.status === "optimized" ? "Optimized" : result.status === "skipped" ? "Skipped" : "Failed"}
                          {result.status === "failed" ? (
                            <span
                              className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-800"
                              title={(() => {
                                const category = classifyErrorCategory(result.error);
                                const meta = failedCategoryMetaByName.get(category);
                                if (!meta) return "Unknown rank metadata";
                                return `Rank #${meta.rank} · ${meta.category} · ${meta.count} item(s) · impact ${formatFileSize(meta.impactBytes)}`;
                              })()}
                            >
                              R{failedRankByCategory.get(classifyErrorCategory(result.error)) ?? "?"}
                            </span>
                          ) : null}
                          {" · "}
                          {result.key}
                          {" · "}
                          saved {formatFileSize(result.savedBytes)}
                        </p>
                        {result.status === "failed" ? (
                          <div className="mt-1">
                            <button
                              type="button"
                              className="text-xs text-red-700 hover:underline"
                              onClick={() => toggleFailedResultExpanded(result.key)}
                            >
                              {expandedFailedKeys.has(result.key) ? "Hide error reason" : "Show error reason"}
                            </button>
                            {expandedFailedKeys.has(result.key) ? (
                              <p className="mt-1 break-all text-xs text-red-600">
                                {result.error || "Unknown processing error."}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : null}
              {Array.isArray(optimizeSummary.candidates) && optimizeSummary.candidates.length > 0 ? (
                <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-200 bg-white p-2">
                  {optimizeSummary.candidates.slice(0, 30).map((candidate) => (
                    <p key={candidate.key} className="text-xs text-slate-600">
                      Candidate · {candidate.key} · {formatFileSize(candidate.sizeBytes)} · est save {formatFileSize(candidate.estimatedSavedBytes)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
