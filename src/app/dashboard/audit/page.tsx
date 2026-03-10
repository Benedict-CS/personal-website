"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: unknown;
  actor?: string | null;
  ip: string | null;
  createdAt: string;
}

type AuditPreset = "all" | "deletes" | "bulk" | "imports" | "optimizations";
const AUDIT_PINNED_STORAGE_KEY = "audit-pinned-rows-v1";
const AUDIT_SAVED_VIEWS_STORAGE_KEY = "audit-saved-views-v1";
const AUDIT_LAST_VIEW_STORAGE_KEY = "audit-last-view-id-v1";
const AUDIT_DEFAULT_VIEW_STORAGE_KEY = "audit-default-view-id-v1";
const AUDIT_SAVED_VIEW_USAGE_STORAGE_KEY = "audit-saved-view-usage-v1";
const AUDIT_SHOW_ARCHIVED_STORAGE_KEY = "audit-show-archived-v1";
const SAVED_VIEW_CATEGORIES = ["General", "Incident", "Content", "Media", "System"] as const;

type AuditSavedView = {
  id: string;
  name: string;
  category: string;
  resourceTypeFilter: string;
  actionFilter: string;
  query: string;
  highRiskOnly: boolean;
  presetFilter: AuditPreset;
  pinnedOnly: boolean;
  archived?: boolean;
};

type AuditSavedViewUsage = {
  count: number;
  lastUsedAt: string;
};

type DeletedSavedViewSnapshot = {
  views: AuditSavedView[];
  usage: Record<string, AuditSavedViewUsage>;
  prevLastAppliedViewId: string;
  prevDefaultStartupViewId: string;
};

type PendingImportState = {
  fileName: string;
  views: AuditSavedView[];
};

function normalizeDetails(details: unknown): unknown {
  if (typeof details !== "string") return details;
  try {
    return JSON.parse(details) as unknown;
  } catch {
    return details;
  }
}

function truncateText(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function toObject(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  return details as Record<string, unknown>;
}

function formatDetails(details: unknown): string {
  if (typeof details === "string") return truncateText(details);
  if (details && typeof details === "object") return truncateText(JSON.stringify(details));
  return "—";
}

function summarizeDetails(action: string, details: unknown): string[] {
  const normalized = normalizeDetails(details);
  const obj = toObject(normalized);
  if (!obj) return [formatDetails(details)];

  if (action === "editor.publish" || action === "editor.draft.save") {
    const mode = typeof obj.mode === "string" ? obj.mode : "unknown";
    const summary = typeof obj.summary === "string" ? obj.summary : "Editor change";
    const snapshot = toObject(obj.snapshot);
    const slug = snapshot && typeof snapshot.slug === "string" ? snapshot.slug : "unknown";
    const text = snapshot ? toObject(snapshot.text) : null;
    const fieldCount = text ? Object.keys(text).length : 0;
    return [
      `${mode.toUpperCase()}: ${summary}`,
      `Slug: ${slug}`,
      fieldCount > 0 ? `Snapshot fields: ${fieldCount}` : "Snapshot captured",
    ];
  }

  if (action === "about_config.update") {
    const updatedKeys = Array.isArray(obj.updatedKeys) ? obj.updatedKeys.length : 0;
    const sectionOrder = Array.isArray(obj.sectionOrder) ? obj.sectionOrder.length : 0;
    return [
      `About config updated`,
      `Updated keys: ${updatedKeys}`,
      sectionOrder > 0 ? `Section order length: ${sectionOrder}` : "Section order unchanged",
    ];
  }

  if (action === "site_content.update") {
    const keys = Array.isArray(obj.keys) ? obj.keys.length : 0;
    return [`Site content updated`, `Updated keys: ${keys}`];
  }

  return [`Object details`, `Fields: ${Object.keys(obj).length}`];
}

function extractDiff(details: unknown): Array<{ field: string; before: string; after: string }> {
  if (!details || typeof details !== "object") return [];
  const obj = details as Record<string, unknown>;
  const before = obj.before && typeof obj.before === "object" ? (obj.before as Record<string, unknown>) : null;
  const after = obj.after && typeof obj.after === "object" ? (obj.after as Record<string, unknown>) : null;
  if (!before || !after) return [];
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys
    .map((key) => {
      const b = before[key];
      const a = after[key];
      return {
        field: key,
        before: b === undefined || b === null ? "—" : String(b),
        after: a === undefined || a === null ? "—" : String(a),
      };
    })
    .filter((row) => row.before !== row.after);
}

function isWarningAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return [
    ".delete",
    ".restore",
    ".bulk",
    ".import",
    ".merge",
    ".cleanup",
    ".optimize",
  ].some((keyword) => normalized.includes(keyword));
}

function matchesPreset(action: string, preset: AuditPreset): boolean {
  const normalized = action.toLowerCase();
  if (preset === "all") return true;
  if (preset === "deletes") return normalized.includes(".delete");
  if (preset === "bulk") return normalized.includes(".bulk");
  if (preset === "imports") return normalized.includes(".import");
  if (preset === "optimizations") return normalized.includes(".optimize") || normalized.includes(".cleanup");
  return true;
}

export default function AuditPage() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [query, setQuery] = useState("");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [presetFilter, setPresetFilter] = useState<AuditPreset>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [savedViews, setSavedViews] = useState<AuditSavedView[]>([]);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewCategory, setSavedViewCategory] = useState<(typeof SAVED_VIEW_CATEGORIES)[number]>("General");
  const [savedViewCategoryFilter, setSavedViewCategoryFilter] = useState<string>("all");
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState("");
  const [lastAppliedViewId, setLastAppliedViewId] = useState("");
  const [defaultStartupViewId, setDefaultStartupViewId] = useState("");
  const [copiedViewId, setCopiedViewId] = useState<string | null>(null);
  const [copiedCurrentFilters, setCopiedCurrentFilters] = useState(false);
  const [savedViewUsage, setSavedViewUsage] = useState<Record<string, AuditSavedViewUsage>>({});
  const [savedViewSort, setSavedViewSort] = useState<"recent" | "frequent" | "name">("recent");
  const [selectedViewIds, setSelectedViewIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<(typeof SAVED_VIEW_CATEGORIES)[number]>("General");
  const [deletedSavedViewSnapshot, setDeletedSavedViewSnapshot] = useState<DeletedSavedViewSnapshot | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [importError, setImportError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showArchivedViews, setShowArchivedViews] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(AUDIT_SHOW_ARCHIVED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const deletedSavedViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const qsResource = searchParams.get("resourceType");
    const qsAction = searchParams.get("action");
    const qsQuery = searchParams.get("q");
    const qsRisk = searchParams.get("risk");
    const qsPreset = searchParams.get("preset");
    const qsPinned = searchParams.get("pinned");
    if (typeof qsResource === "string") setResourceTypeFilter(qsResource);
    if (typeof qsAction === "string") setActionFilter(qsAction);
    if (typeof qsQuery === "string") setQuery(qsQuery);
    if (qsRisk === "high") setHighRiskOnly(true);
    if (qsPreset === "deletes" || qsPreset === "bulk" || qsPreset === "imports" || qsPreset === "optimizations") {
      setPresetFilter(qsPreset);
    }
    if (qsPinned === "1") setPinnedOnly(true);
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_PINNED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setPinnedIds(new Set(parsed.filter((id) => typeof id === "string" && id.trim().length > 0)));
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_PINNED_STORAGE_KEY, JSON.stringify(Array.from(pinnedIds)));
    } catch {
      // Ignore storage write failures.
    }
  }, [pinnedIds]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_SAVED_VIEWS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuditSavedView[];
      if (Array.isArray(parsed)) {
        const safe = parsed.filter((view) => {
          if (!view || typeof view !== "object") return false;
          if (typeof view.id !== "string" || typeof view.name !== "string") return false;
          if (
            view.presetFilter !== "all" &&
            view.presetFilter !== "deletes" &&
            view.presetFilter !== "bulk" &&
            view.presetFilter !== "imports" &&
            view.presetFilter !== "optimizations"
          ) {
            return false;
          }
          if (view.category !== undefined && typeof view.category !== "string") {
            return false;
          }
          return true;
        });
        setSavedViews(
          safe.map((view) => ({
            ...view,
            category: typeof view.category === "string" && view.category.trim() ? view.category : "General",
            archived: view.archived === true,
          }))
        );
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
    } catch {
      // Ignore storage write failures.
    }
  }, [savedViews]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_LAST_VIEW_STORAGE_KEY);
      if (typeof raw === "string" && raw.trim().length > 0) {
        setLastAppliedViewId(raw);
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      if (lastAppliedViewId.trim()) {
        localStorage.setItem(AUDIT_LAST_VIEW_STORAGE_KEY, lastAppliedViewId);
      } else {
        localStorage.removeItem(AUDIT_LAST_VIEW_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write failures.
    }
  }, [lastAppliedViewId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_DEFAULT_VIEW_STORAGE_KEY);
      if (typeof raw === "string" && raw.trim().length > 0) {
        setDefaultStartupViewId(raw);
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      if (defaultStartupViewId.trim()) {
        localStorage.setItem(AUDIT_DEFAULT_VIEW_STORAGE_KEY, defaultStartupViewId);
      } else {
        localStorage.removeItem(AUDIT_DEFAULT_VIEW_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write failures.
    }
  }, [defaultStartupViewId]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_SHOW_ARCHIVED_STORAGE_KEY, String(showArchivedViews));
    } catch {
      // Ignore storage write failures.
    }
  }, [showArchivedViews]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_SAVED_VIEW_USAGE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, AuditSavedViewUsage>;
      if (parsed && typeof parsed === "object") {
        const safe = Object.entries(parsed).reduce<Record<string, AuditSavedViewUsage>>((acc, [id, usage]) => {
          if (!usage || typeof usage !== "object") return acc;
          const count = typeof usage.count === "number" && Number.isFinite(usage.count) ? usage.count : 0;
          const lastUsedAt = typeof usage.lastUsedAt === "string" ? usage.lastUsedAt : "";
          acc[id] = { count, lastUsedAt };
          return acc;
        }, {});
        setSavedViewUsage(safe);
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_SAVED_VIEW_USAGE_STORAGE_KEY, JSON.stringify(savedViewUsage));
    } catch {
      // Ignore storage write failures.
    }
  }, [savedViewUsage]);

  useEffect(() => {
    if (!defaultStartupViewId.trim()) return;
    const hasExplicitUrlFilters = ["resourceType", "action", "q", "risk", "preset", "pinned"].some(
      (key) => searchParams.get(key) !== null
    );
    if (hasExplicitUrlFilters) return;
    const target = savedViews.find((view) => view.id === defaultStartupViewId);
    if (!target) return;
    setResourceTypeFilter(target.resourceTypeFilter);
    setActionFilter(target.actionFilter);
    setQuery(target.query);
    setHighRiskOnly(target.highRiskOnly);
    setPresetFilter(target.presetFilter);
    setPinnedOnly(target.pinnedOnly);
    setLastAppliedViewId(target.id);
  }, [defaultStartupViewId, savedViews, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (resourceTypeFilter.trim()) params.set("resourceType", resourceTypeFilter.trim());
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    fetch(`/api/audit?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [actionFilter, resourceTypeFilter]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filteredEntries = entries.filter((entry) => {
    const q = query.trim().toLowerCase();
    if (highRiskOnly && !isWarningAction(entry.action)) return false;
    if (!matchesPreset(entry.action, presetFilter)) return false;
    if (pinnedOnly && !pinnedIds.has(entry.id)) return false;
    if (!q) return true;
    const detailsText =
      typeof entry.details === "string"
        ? entry.details
        : entry.details && typeof entry.details === "object"
          ? JSON.stringify(entry.details)
          : "";
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.resourceType.toLowerCase().includes(q) ||
      String(entry.resourceId ?? "").toLowerCase().includes(q) ||
      String(entry.actor ?? "").toLowerCase().includes(q) ||
      detailsText.toLowerCase().includes(q)
    );
  });

  const dateFilteredEntries = filteredEntries.filter((entry) => {
    const t = new Date(entry.createdAt).getTime();
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (t < from.getTime()) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (t > to.getTime()) return false;
    }
    return true;
  });

  const displayedEntries = [...dateFilteredEntries].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 1 : 0;
    const bPinned = pinnedIds.has(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const escapeCsv = (value: string): string => {
    const needsQuotes = /[",\n\r]/.test(value);
    if (!needsQuotes) return value;
    return `"${value.replace(/"/g, '""')}"`;
  };

  const exportVisibleAsCsv = () => {
    const header = ["Time", "Action", "Resource", "ResourceId", "Actor", "IP", "Summary"];
    const rows = displayedEntries.map((entry) => {
      const normalizedDetails = normalizeDetails(entry.details);
      const summary = summarizeDetails(entry.action, normalizedDetails).join(" | ");
      return [
        formatDate(entry.createdAt),
        entry.action,
        entry.resourceType,
        entry.resourceId ?? "",
        entry.actor ?? "",
        entry.ip ?? "",
        summary,
      ].map(String).map(escapeCsv);
    });
    const csv = [header.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyInvestigationNote = async (entry: AuditEntry) => {
    const normalizedDetails = normalizeDetails(entry.details);
    const detailSummary = summarizeDetails(entry.action, normalizedDetails).join(" | ");
    const note = [
      "Audit Investigation Note",
      `Time: ${formatDate(entry.createdAt)}`,
      `Action: ${entry.action}`,
      `Resource: ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ""}`,
      `Actor: ${entry.actor ?? "Unknown"}`,
      `IP: ${entry.ip ?? "Unknown"}`,
      `Risk: ${isWarningAction(entry.action) ? "Warning" : "Normal"}`,
      `Summary: ${detailSummary}`,
      "Assessment:",
      "- Impact:",
      "- Root cause:",
      "- Mitigation:",
      "- Follow-up:",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(note);
      setCopiedNoteId(entry.id);
      setTimeout(() => setCopiedNoteId(null), 1800);
    } catch {
      setCopiedNoteId(null);
    }
  };

  const togglePin = (entryId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const saveCurrentView = () => {
    const name = savedViewName.trim();
    if (!name) return;
    const view: AuditSavedView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: savedViewCategory,
      resourceTypeFilter,
      actionFilter,
      query,
      highRiskOnly,
      presetFilter,
      pinnedOnly,
      archived: false,
    };
    setSavedViews((prev) => [view, ...prev].slice(0, 20));
    setSavedViewName("");
  };

  const quickSaveCurrentView = () => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const name = `Quick save ${timeLabel}`;
    const view: AuditSavedView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: savedViewCategory,
      resourceTypeFilter,
      actionFilter,
      query,
      highRiskOnly,
      presetFilter,
      pinnedOnly,
      archived: false,
    };
    setSavedViews((prev) => [view, ...prev].slice(0, 20));
  };

  const applySavedView = (view: AuditSavedView) => {
    setResourceTypeFilter(view.resourceTypeFilter);
    setActionFilter(view.actionFilter);
    setQuery(view.query);
    setHighRiskOnly(view.highRiskOnly);
    setPresetFilter(view.presetFilter);
    setPinnedOnly(view.pinnedOnly);
    setLastAppliedViewId(view.id);
    setSavedViewUsage((prev) => {
      const current = prev[view.id];
      return {
        ...prev,
        [view.id]: {
          count: (current?.count ?? 0) + 1,
          lastUsedAt: new Date().toISOString(),
        },
      };
    });
  };

  const deleteSavedView = (id: string) => {
    const removedView = savedViews.find((view) => view.id === id);
    if (removedView) {
      const removedUsage = savedViewUsage[id] ? { [id]: savedViewUsage[id] } : {};
      setDeletedSavedViewSnapshot({
        views: [removedView],
        usage: removedUsage,
        prevLastAppliedViewId: lastAppliedViewId,
        prevDefaultStartupViewId: defaultStartupViewId,
      });
    }
    setSavedViews((prev) => prev.filter((view) => view.id !== id));
    if (lastAppliedViewId === id) {
      setLastAppliedViewId("");
    }
    if (defaultStartupViewId === id) {
      setDefaultStartupViewId("");
    }
    setSavedViewUsage((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedViewIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const startRenameSavedView = (view: AuditSavedView) => {
    setEditingViewId(view.id);
    setEditingViewName(view.name);
  };

  const commitRenameSavedView = () => {
    if (!editingViewId) return;
    const nextName = editingViewName.trim();
    if (!nextName) return;
    setSavedViews((prev) =>
      prev.map((view) => (view.id === editingViewId ? { ...view, name: nextName } : view))
    );
    setEditingViewId(null);
    setEditingViewName("");
  };

  const overwriteSavedView = (id: string) => {
    setSavedViews((prev) =>
      prev.map((view) =>
        view.id === id
          ? {
              ...view,
              resourceTypeFilter,
              actionFilter,
              query,
              highRiskOnly,
              presetFilter,
              pinnedOnly,
            }
          : view
      )
    );
  };

  const reapplyLastView = () => {
    const target = savedViews.find((view) => view.id === lastAppliedViewId);
    if (!target) return;
    applySavedView(target);
  };

  const copySavedViewLink = async (view: AuditSavedView) => {
    const params = new URLSearchParams();
    if (view.resourceTypeFilter.trim()) params.set("resourceType", view.resourceTypeFilter.trim());
    if (view.actionFilter.trim()) params.set("action", view.actionFilter.trim());
    if (view.query.trim()) params.set("q", view.query.trim());
    if (view.highRiskOnly) params.set("risk", "high");
    if (view.presetFilter !== "all") params.set("preset", view.presetFilter);
    if (view.pinnedOnly) params.set("pinned", "1");
    const queryString = params.toString();
    const targetUrl = `${window.location.origin}/dashboard/audit${queryString ? `?${queryString}` : ""}`;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedViewId(view.id);
      setTimeout(() => setCopiedViewId(null), 1600);
    } catch {
      setCopiedViewId(null);
    }
  };

  const copyCurrentFiltersUrl = async () => {
    const params = new URLSearchParams();
    if (resourceTypeFilter.trim()) params.set("resourceType", resourceTypeFilter.trim());
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    if (query.trim()) params.set("q", query.trim());
    if (highRiskOnly) params.set("risk", "high");
    if (presetFilter !== "all") params.set("preset", presetFilter);
    if (pinnedOnly) params.set("pinned", "1");
    const queryString = params.toString();
    const targetUrl = `${window.location.origin}/dashboard/audit${queryString ? `?${queryString}` : ""}`;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedCurrentFilters(true);
      setTimeout(() => setCopiedCurrentFilters(false), 1600);
    } catch {
      setCopiedCurrentFilters(false);
    }
  };

  const toggleDefaultStartupView = (viewId: string) => {
    setDefaultStartupViewId((prev) => (prev === viewId ? "" : viewId));
  };

  const duplicateSavedView = (view: AuditSavedView) => {
    const duplicate: AuditSavedView = {
      ...view,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${view.name} (copy)`,
      archived: false,
    };
    setSavedViews((prev) => [duplicate, ...prev].slice(0, 20));
  };

  const toggleArchiveSavedView = (viewId: string) => {
    setSavedViews((prev) =>
      prev.map((view) => (view.id === viewId ? { ...view, archived: !view.archived } : view))
    );
  };

  const toggleSavedViewSelection = (viewId: string) => {
    setSelectedViewIds((prev) => {
      const next = new Set(prev);
      if (next.has(viewId)) {
        next.delete(viewId);
      } else {
        next.add(viewId);
      }
      return next;
    });
  };

  const clearSavedViewSelection = () => {
    setSelectedViewIds(new Set());
    setConfirmBulkDelete(false);
    setDeleteConfirmText("");
  };

  const selectAllVisibleSavedViews = () => {
    setSelectedViewIds(new Set(sortedVisibleSavedViews.map((view) => view.id)));
    setConfirmBulkDelete(false);
    setDeleteConfirmText("");
  };

  const bulkDeleteSavedViews = () => {
    if (selectedViewIds.size === 0) return;
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      setDeleteConfirmText("");
      return;
    }
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      return;
    }
    const selected = new Set(selectedViewIds);
    const removedViews = savedViews.filter((view) => selected.has(view.id));
    const removedUsage = removedViews.reduce<Record<string, AuditSavedViewUsage>>((acc, view) => {
      const usage = savedViewUsage[view.id];
      if (usage) acc[view.id] = usage;
      return acc;
    }, {});
    if (removedViews.length > 0) {
      setDeletedSavedViewSnapshot({
        views: removedViews,
        usage: removedUsage,
        prevLastAppliedViewId: lastAppliedViewId,
        prevDefaultStartupViewId: defaultStartupViewId,
      });
    }
    setSavedViews((prev) => prev.filter((view) => !selected.has(view.id)));
    setSavedViewUsage((prev) => {
      const next = { ...prev };
      for (const id of selected) {
        delete next[id];
      }
      return next;
    });
    if (lastAppliedViewId && selected.has(lastAppliedViewId)) {
      setLastAppliedViewId("");
    }
    if (defaultStartupViewId && selected.has(defaultStartupViewId)) {
      setDefaultStartupViewId("");
    }
    setSelectedViewIds(new Set());
    setConfirmBulkDelete(false);
    setDeleteConfirmText("");
  };

  const undoDeleteSavedViews = () => {
    if (!deletedSavedViewSnapshot || deletedSavedViewSnapshot.views.length === 0) return;
    const restoredIds = new Set(deletedSavedViewSnapshot.views.map((view) => view.id));
    setSavedViews((prev) => {
      const withoutConflicts = prev.filter((view) => !restoredIds.has(view.id));
      return [...deletedSavedViewSnapshot.views, ...withoutConflicts].slice(0, 20);
    });
    setSavedViewUsage((prev) => ({
      ...prev,
      ...deletedSavedViewSnapshot.usage,
    }));
    if (deletedSavedViewSnapshot.prevLastAppliedViewId && restoredIds.has(deletedSavedViewSnapshot.prevLastAppliedViewId)) {
      setLastAppliedViewId(deletedSavedViewSnapshot.prevLastAppliedViewId);
    }
    if (
      deletedSavedViewSnapshot.prevDefaultStartupViewId &&
      restoredIds.has(deletedSavedViewSnapshot.prevDefaultStartupViewId)
    ) {
      setDefaultStartupViewId(deletedSavedViewSnapshot.prevDefaultStartupViewId);
    }
    setDeletedSavedViewSnapshot(null);
  };

  const bulkMoveSavedViewsCategory = () => {
    if (selectedViewIds.size === 0) return;
    const selected = new Set(selectedViewIds);
    setSavedViews((prev) =>
      prev.map((view) => (selected.has(view.id) ? { ...view, category: bulkCategory } : view))
    );
  };

  const exportSavedViews = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      views: savedViews,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-saved-views-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedSavedViews = () => {
    if (selectedViewIds.size === 0) return;
    const selected = savedViews.filter((view) => selectedViewIds.has(view.id));
    if (selected.length === 0) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      views: selected,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-saved-views-selected-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importSavedViews = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportError("");
      setPendingImport(null);
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const rawViews = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { views?: unknown }).views)
          ? ((parsed as { views: unknown[] }).views ?? [])
          : [];
      const normalized = rawViews
        .filter((item): item is Partial<AuditSavedView> => !!item && typeof item === "object")
        .map((item) => {
          const category =
            typeof item.category === "string" && item.category.trim() ? item.category.trim() : "General";
          const presetCandidate = item.presetFilter;
          const presetFilter: AuditPreset =
            presetCandidate === "deletes" ||
            presetCandidate === "bulk" ||
            presetCandidate === "imports" ||
            presetCandidate === "optimizations"
              ? presetCandidate
              : "all";
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Imported view",
            category,
            resourceTypeFilter: typeof item.resourceTypeFilter === "string" ? item.resourceTypeFilter : "",
            actionFilter: typeof item.actionFilter === "string" ? item.actionFilter : "",
            query: typeof item.query === "string" ? item.query : "",
            highRiskOnly: Boolean(item.highRiskOnly),
            presetFilter,
            pinnedOnly: Boolean(item.pinnedOnly),
            archived: false,
          } satisfies AuditSavedView;
        });
      if (normalized.length > 0) {
        setPendingImport({
          fileName: file.name,
          views: normalized,
        });
      } else {
        setImportError("No valid saved views found in this file.");
      }
    } catch {
      setPendingImport(null);
      setImportError("Invalid JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const applyPendingImport = () => {
    if (!pendingImport || pendingImport.views.length === 0) return;
    setSavedViews((prev) => [...pendingImport.views, ...prev].slice(0, 20));
    setPendingImport(null);
    setImportError("");
  };

  const cancelPendingImport = () => {
    setPendingImport(null);
  };

  const presetCounts = {
    all: entries.length,
    deletes: entries.filter((entry) => matchesPreset(entry.action, "deletes")).length,
    bulk: entries.filter((entry) => matchesPreset(entry.action, "bulk")).length,
    imports: entries.filter((entry) => matchesPreset(entry.action, "imports")).length,
    optimizations: entries.filter((entry) => matchesPreset(entry.action, "optimizations")).length,
  };
  const visibleSavedViews = savedViews.filter((view) => {
    const categoryMatch =
      savedViewCategoryFilter === "all" || view.category === savedViewCategoryFilter;
    const archivedMatch = showArchivedViews ? view.archived === true : view.archived !== true;
    return categoryMatch && archivedMatch;
  });
  const sortedVisibleSavedViews = [...visibleSavedViews].sort((a, b) => {
    if (savedViewSort === "name") {
      return a.name.localeCompare(b.name);
    }
    if (savedViewSort === "frequent") {
      const aCount = savedViewUsage[a.id]?.count ?? 0;
      const bCount = savedViewUsage[b.id]?.count ?? 0;
      if (aCount !== bCount) return bCount - aCount;
    }
    const aRecent = savedViewUsage[a.id]?.lastUsedAt ?? "";
    const bRecent = savedViewUsage[b.id]?.lastUsedAt ?? "";
    if (aRecent !== bRecent) return bRecent.localeCompare(aRecent);
    return a.name.localeCompare(b.name);
  });
  const selectedViewNames = sortedVisibleSavedViews
    .filter((view) => selectedViewIds.has(view.id))
    .map((view) => view.name);
  const pendingImportCount = pendingImport?.views.length ?? 0;
  const pendingImportKeptCount = Math.min(pendingImportCount, 20);
  const pendingImportDroppedCount = Math.max(0, pendingImportCount - pendingImportKeptCount);
  const pendingExistingDroppedCount = pendingImport
    ? Math.max(0, savedViews.length + pendingImportKeptCount - 20)
    : 0;

  const activeFiltersSummary: string[] = [];
  if (resourceTypeFilter.trim()) activeFiltersSummary.push(`Resource: ${resourceTypeFilter.trim()}`);
  if (actionFilter.trim()) activeFiltersSummary.push(`Action: ${actionFilter.trim()}`);
  if (query.trim()) activeFiltersSummary.push(`Q: ${query.trim()}`);
  if (highRiskOnly) activeFiltersSummary.push("High risk");
  if (presetFilter !== "all") activeFiltersSummary.push(`Preset: ${presetFilter}`);
  if (pinnedOnly) activeFiltersSummary.push("Pinned only");
  const hasActiveFilters = activeFiltersSummary.length > 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || !event.shiftKey) return;
      if (event.key < "1" || event.key > "9") return;
      const idx = Number(event.key) - 1;
      const target = sortedVisibleSavedViews[idx];
      if (!target) return;
      event.preventDefault();
      applySavedView(target);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sortedVisibleSavedViews]);

  useEffect(() => {
    if (deletedSavedViewTimerRef.current) {
      clearTimeout(deletedSavedViewTimerRef.current);
      deletedSavedViewTimerRef.current = null;
    }
    if (!deletedSavedViewSnapshot) return;
    deletedSavedViewTimerRef.current = setTimeout(() => {
      setDeletedSavedViewSnapshot(null);
      deletedSavedViewTimerRef.current = null;
    }, 8000);
    return () => {
      if (deletedSavedViewTimerRef.current) {
        clearTimeout(deletedSavedViewTimerRef.current);
        deletedSavedViewTimerRef.current = null;
      }
    };
  }, [deletedSavedViewSnapshot]);

  useEffect(() => {
    if (selectedViewIds.size === 0 && confirmBulkDelete) {
      setConfirmBulkDelete(false);
      setDeleteConfirmText("");
    }
  }, [selectedViewIds, confirmBulkDelete]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-[var(--foreground)]">Audit log</h2>
      <p className="text-sm text-[var(--muted-foreground)]">
        Recent actions (post create/update/delete, import). Only visible when logged in.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-2 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <Input
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              placeholder="Filter by resource type (e.g. custom_page)"
            />
            <Input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action (e.g. editor.publish)"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor/details/resource id"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResourceTypeFilter("");
                setActionFilter("");
                setQuery("");
                setHighRiskOnly(false);
                setPresetFilter("all");
                setPinnedOnly(false);
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant={highRiskOnly ? "destructive" : "outline"}
              onClick={() => setHighRiskOnly((prev) => !prev)}
            >
              High risk only
            </Button>
            <Button
              type="button"
              variant={pinnedOnly ? "default" : "outline"}
              onClick={() => setPinnedOnly((prev) => !prev)}
            >
              Pinned only ({pinnedIds.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyCurrentFiltersUrl()}
            >
              {copiedCurrentFilters ? "Copied" : "Copy current filters"}
            </Button>
          </div>
          {hasActiveFilters ? (
            <p className="mb-2 text-xs text-[var(--muted-foreground)]">
              Active: {activeFiltersSummary.join(" · ")}
            </p>
          ) : (
            <p className="mb-2 text-xs text-[var(--muted-foreground)]">No filters applied</p>
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">Date range:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              disabled={!dateFrom && !dateTo}
            >
              Clear dates
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportVisibleAsCsv}
              disabled={displayedEntries.length === 0}
            >
              Export visible as CSV
            </Button>
          </div>
          <div className="mb-3 rounded-lg border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={savedViewName}
                onChange={(e) => setSavedViewName(e.target.value)}
                placeholder="Save current view as..."
                className="h-9 w-full md:max-w-xs"
              />
              <select
                value={savedViewCategory}
                onChange={(e) => setSavedViewCategory(e.target.value as (typeof SAVED_VIEW_CATEGORIES)[number])}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground shadow-[var(--shadow-sm)]"
              >
                {SAVED_VIEW_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" variant="outline" onClick={saveCurrentView} disabled={!savedViewName.trim()}>
                Save view
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={quickSaveCurrentView}>
                Quick save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={reapplyLastView}
                disabled={!savedViews.some((view) => view.id === lastAppliedViewId)}
              >
                Reapply last view
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportSavedViews} disabled={savedViews.length === 0}>
                Export JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => importInputRef.current?.click()}
              >
                Import JSON
              </Button>
              <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={importSavedViews} />
            </div>
            {importError ? (
              <p className="mt-2 text-xs text-rose-700">{importError}</p>
            ) : null}
            {pendingImport ? (
              <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-900">
                <p className="font-medium">Import preview: {pendingImport.fileName}</p>
                <p className="mt-1">
                  Valid views: {pendingImportCount}. Imported now: {pendingImportKeptCount}
                  {pendingImportDroppedCount > 0 ? ` (drops ${pendingImportDroppedCount} over-limit imported views)` : ""}.
                </p>
                {pendingExistingDroppedCount > 0 ? (
                  <p className="mt-1 text-amber-700">
                    Warning: {pendingExistingDroppedCount} existing saved view
                    {pendingExistingDroppedCount > 1 ? "s may" : " may"} be pushed out by the 20-view limit.
                  </p>
                ) : null}
                <p className="mt-1">
                  {pendingImport.views.slice(0, 5).map((view) => view.name).join(", ")}
                  {pendingImport.views.length > 5 ? ` (+${pendingImport.views.length - 5} more)` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="default" onClick={applyPendingImport}>
                    Apply import
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelPendingImport}>
                    Cancel import
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={savedViewCategoryFilter === "all" ? "default" : "outline"}
                onClick={() => setSavedViewCategoryFilter("all")}
              >
                All categories
              </Button>
              {SAVED_VIEW_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={savedViewCategoryFilter === category ? "default" : "outline"}
                  onClick={() => setSavedViewCategoryFilter(category)}
                >
                  {category}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={showArchivedViews ? "default" : "outline"}
                onClick={() => setShowArchivedViews((prev) => !prev)}
              >
                Show archived ({savedViews.filter((v) => v.archived).length})
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={savedViewSort === "recent" ? "default" : "outline"}
                onClick={() => setSavedViewSort("recent")}
              >
                Sort: Recent
              </Button>
              <Button
                type="button"
                size="sm"
                variant={savedViewSort === "frequent" ? "default" : "outline"}
                onClick={() => setSavedViewSort("frequent")}
              >
                Sort: Frequent
              </Button>
              <Button
                type="button"
                size="sm"
                variant={savedViewSort === "name" ? "default" : "outline"}
                onClick={() => setSavedViewSort("name")}
              >
                Sort: Name
              </Button>
              <span className="text-xs text-[var(--muted-foreground)]">Quick apply: Alt+Shift+1..9</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={selectAllVisibleSavedViews}>
                Select visible ({sortedVisibleSavedViews.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearSavedViewSelection}
                disabled={selectedViewIds.size === 0}
              >
                Clear selection
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirmBulkDelete ? "destructive" : "outline"}
                onClick={bulkDeleteSavedViews}
                disabled={selectedViewIds.size === 0 || (confirmBulkDelete && deleteConfirmText.trim().toUpperCase() !== "DELETE")}
              >
                {confirmBulkDelete ? `Confirm delete (${selectedViewIds.size})` : `Delete selected (${selectedViewIds.size})`}
              </Button>
              {confirmBulkDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirmBulkDelete(false);
                    setDeleteConfirmText("");
                  }}
                >
                  Cancel delete
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportSelectedSavedViews}
                disabled={selectedViewIds.size === 0}
              >
                Export selected
              </Button>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value as (typeof SAVED_VIEW_CATEGORIES)[number])}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground shadow-[var(--shadow-sm)]"
              >
                {SAVED_VIEW_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={bulkMoveSavedViewsCategory}
                disabled={selectedViewIds.size === 0}
              >
                Move selected
              </Button>
            </div>
            {confirmBulkDelete && selectedViewNames.length > 0 ? (
              <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-2 text-xs text-rose-800">
                <p className="font-medium">Delete preview</p>
                <p className="mt-1">
                  {selectedViewNames.slice(0, 5).join(", ")}
                  {selectedViewNames.length > 5 ? ` (+${selectedViewNames.length - 5} more)` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Type DELETE to enable confirm:</span>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="h-7 w-28 bg-white text-xs"
                  />
                </div>
              </div>
            ) : null}
            {deletedSavedViewSnapshot ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-900">
                <span>
                  Deleted {deletedSavedViewSnapshot.views.length} saved view
                  {deletedSavedViewSnapshot.views.length > 1 ? "s" : ""}.
                </span>
                <Button type="button" size="sm" variant="outline" onClick={undoDeleteSavedViews}>
                  Undo
                </Button>
              </div>
            ) : null}
            {defaultStartupViewId ? (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Startup view:
                {" "}
                {savedViews.find((view) => view.id === defaultStartupViewId)?.name ?? "Missing saved view"}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Startup view: none</p>
            )}
            {visibleSavedViews.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {sortedVisibleSavedViews.map((view, index) => (
                  <div key={view.id} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-2 py-1">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer rounded border-input"
                      checked={selectedViewIds.has(view.id)}
                      onChange={() => toggleSavedViewSelection(view.id)}
                      aria-label={`Select saved view ${view.name}`}
                    />
                    {index < 9 ? (
                      <span className="rounded bg-[var(--muted)] px-1 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                        {index + 1}
                      </span>
                    ) : null}
                    <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {view.category}
                    </span>
                    {editingViewId === view.id ? (
                      <>
                        <Input
                          value={editingViewName}
                          onChange={(e) => setEditingViewName(e.target.value)}
                          className="h-7 w-36 text-xs"
                          placeholder="View name"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={commitRenameSavedView}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingViewId(null);
                            setEditingViewName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                          onClick={() => applySavedView(view)}
                        >
                          {view.name}
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => overwriteSavedView(view.id)}
                        >
                          Overwrite
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => void copySavedViewLink(view)}
                        >
                          {copiedViewId === view.id ? "Copied" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          className={`text-[11px] ${defaultStartupViewId === view.id ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                          onClick={() => toggleDefaultStartupView(view.id)}
                        >
                          {defaultStartupViewId === view.id ? "Default" : "Set default"}
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => duplicateSavedView(view)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => toggleArchiveSavedView(view.id)}
                        >
                          {view.archived ? "Unarchive" : "Archive"}
                        </button>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          used {savedViewUsage[view.id]?.count ?? 0}
                        </span>
                        <button
                          type="button"
                          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => startRenameSavedView(view)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          onClick={() => deleteSavedView(view.id)}
                          aria-label={`Delete saved view ${view.name}`}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={presetFilter === "all" ? "default" : "outline"}
              onClick={() => setPresetFilter("all")}
            >
              All ({presetCounts.all})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetFilter === "deletes" ? "default" : "outline"}
              onClick={() => setPresetFilter("deletes")}
            >
              Deletes ({presetCounts.deletes})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetFilter === "bulk" ? "default" : "outline"}
              onClick={() => setPresetFilter("bulk")}
            >
              Bulk ops ({presetCounts.bulk})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetFilter === "imports" ? "default" : "outline"}
              onClick={() => setPresetFilter("imports")}
            >
              Imports ({presetCounts.imports})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetFilter === "optimizations" ? "default" : "outline"}
              onClick={() => setPresetFilter("optimizations")}
            >
              Optimizations ({presetCounts.optimizations})
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : displayedEntries.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Time</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Pin</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Action</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Resource</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Actor</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">Details</th>
                    <th className="pb-2 pr-4 font-medium text-[var(--foreground)]">IP</th>
                    <th className="pb-2 font-medium text-[var(--foreground)]">Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((e) => (
                    (() => {
                      const normalizedDetails = normalizeDetails(e.details);
                      const diff = extractDiff(normalizedDetails);
                      const expanded = expandedRows.has(e.id);
                      const pinned = pinnedIds.has(e.id);
                      return (
                        <tr key={e.id} className="border-b border-[var(--border)] transition-colors duration-150 hover:bg-[var(--accent)]/30">
                          <td className="py-2 pr-4 text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(e.createdAt)}</td>
                          <td className="py-2 pr-4">
                            <Button
                              type="button"
                              size="icon"
                              variant={pinned ? "default" : "outline"}
                              className="h-7 w-7"
                              onClick={() => togglePin(e.id)}
                              title={pinned ? "Unpin row" : "Pin row"}
                            >
                              {pinned ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                            </Button>
                          </td>
                          <td className="py-2 pr-4 font-mono text-[var(--foreground)]">{e.action}</td>
                          <td className="py-2 pr-4">{e.resourceType}{e.resourceId ? ` ${e.resourceId.slice(0, 8)}…` : ""}</td>
                          <td className="py-2 pr-4 text-[var(--muted-foreground)]">{e.actor ?? "—"}</td>
                          <td className="py-2 pr-4 text-[var(--muted-foreground)] max-w-[460px] align-top">
                            {diff.length > 0 ? (
                              <div className="space-y-1">
                                {(expanded ? diff : diff.slice(0, 4)).map((row) => (
                                  <div key={row.field} className="text-xs text-[var(--foreground)]">
                                    <span className="font-medium">{row.field}</span>: {row.before} → {row.after}
                                  </div>
                                ))}
                                {diff.length > 4 ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                    onClick={() =>
                                      setExpandedRows((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(e.id)) next.delete(e.id);
                                        else next.add(e.id);
                                        return next;
                                      })
                                    }
                                  >
                                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    {expanded ? "Show less" : `Show all ${diff.length} changes`}
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {summarizeDetails(e.action, e.details).map((line) => (
                                  <div key={`${e.id}-${line}`} className="break-all text-xs text-[var(--foreground)]">
                                    {line}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                  onClick={() =>
                                    setExpandedRows((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(e.id)) next.delete(e.id);
                                      else next.add(e.id);
                                      return next;
                                    })
                                  }
                                >
                                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  {expanded ? "Hide payload" : "View payload"}
                                </button>
                                {expanded ? (
                                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--muted)]/50 p-2 text-[11px] text-[var(--foreground)]">
                                    {typeof e.details === "string"
                                      ? e.details
                                      : JSON.stringify(normalizedDetails, null, 2)}
                                  </pre>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-[var(--muted-foreground)]">{e.ip ?? "—"}</td>
                          <td className="py-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void copyInvestigationNote(e)}
                            >
                              {copiedNoteId === e.id ? "Note copied" : "Copy note"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
