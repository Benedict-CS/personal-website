"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [query, setQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (resourceTypeFilter.trim()) params.set("resourceType", resourceTypeFilter.trim());
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    fetch(`/api/audit?${params.toString()}`)
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Audit log</h2>
      <p className="text-sm text-slate-600">
        Recent actions (post create/update/delete, import). Only visible when logged in.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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
              }}
            >
              Reset
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-slate-500">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-2 pr-4 font-medium text-slate-700">Time</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Action</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Resource</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Actor</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Details</th>
                    <th className="pb-2 font-medium text-slate-700">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e) => (
                    (() => {
                      const normalizedDetails = normalizeDetails(e.details);
                      const diff = extractDiff(normalizedDetails);
                      const expanded = expandedRows.has(e.id);
                      return (
                        <tr key={e.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                          <td className="py-2 pr-4 font-mono text-slate-800">{e.action}</td>
                          <td className="py-2 pr-4">{e.resourceType}{e.resourceId ? ` ${e.resourceId.slice(0, 8)}…` : ""}</td>
                          <td className="py-2 pr-4 text-slate-600">{e.actor ?? "—"}</td>
                          <td className="py-2 pr-4 text-slate-600 max-w-[460px] align-top">
                            {diff.length > 0 ? (
                              <div className="space-y-1">
                                {(expanded ? diff : diff.slice(0, 4)).map((row) => (
                                  <div key={row.field} className="text-xs text-slate-700">
                                    <span className="font-medium">{row.field}</span>: {row.before} → {row.after}
                                  </div>
                                ))}
                                {diff.length > 4 ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
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
                                  <div key={`${e.id}-${line}`} className="break-all text-xs text-slate-700">
                                    {line}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
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
                                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                                    {typeof e.details === "string"
                                      ? e.details
                                      : JSON.stringify(normalizedDetails, null, 2)}
                                  </pre>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-slate-500">{e.ip ?? "—"}</td>
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
