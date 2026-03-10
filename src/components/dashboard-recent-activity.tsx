"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ActivityEntry = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
};

type ActivityFilter = "all" | "content" | "media" | "system";
type SeverityLevel = "normal" | "warning";

const DEFAULT_VISIBLE_COUNT = 8;
const EXPANDED_VISIBLE_COUNT = 20;

function classifyActivity(entry: ActivityEntry): Exclude<ActivityFilter, "all"> {
  const action = entry.action.toLowerCase();
  const resource = entry.resourceType.toLowerCase();
  if (
    action.startsWith("media.") ||
    resource.includes("media") ||
    resource.includes("asset")
  ) {
    return "media";
  }
  if (
    action.startsWith("backup.") ||
    action.startsWith("import.") ||
    action.startsWith("export.") ||
    resource.includes("system") ||
    resource.includes("health")
  ) {
    return "system";
  }
  return "content";
}

function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US")} ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function classifySeverity(entry: ActivityEntry): SeverityLevel {
  const action = entry.action.toLowerCase();
  const riskyKeywords = [
    ".delete",
    ".restore",
    ".bulk",
    ".import",
    ".merge",
    ".cleanup",
    ".optimize",
  ];
  return riskyKeywords.some((keyword) => action.includes(keyword)) ? "warning" : "normal";
}

export function DashboardRecentActivity({ entries }: { entries: ActivityEntry[] }) {
  const [liveEntries, setLiveEntries] = useState<ActivityEntry[]>(entries);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    setLiveEntries(entries);
    setLastUpdatedAt(new Date().toISOString());
  }, [entries]);

  const refreshEntries = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch("/api/audit?limit=30", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to refresh activity.");
      }
      const data = (await response.json()) as Array<{
        id: string;
        action: string;
        resourceType: string;
        createdAt: string;
      }>;
      const normalized = Array.isArray(data)
        ? data.map((item) => ({
            id: String(item.id ?? ""),
            action: String(item.action ?? ""),
            resourceType: String(item.resourceType ?? ""),
            createdAt: String(item.createdAt ?? ""),
          }))
        : [];
      setLiveEntries(normalized);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void refreshEntries();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshEntries]);

  const counts = useMemo(() => {
    const base = { all: liveEntries.length, content: 0, media: 0, system: 0 };
    for (const entry of liveEntries) {
      const category = classifyActivity(entry);
      base[category] += 1;
    }
    return base;
  }, [liveEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return liveEntries.filter((entry) => {
      if (filter !== "all" && classifyActivity(entry) !== filter) return false;
      if (highRiskOnly && classifySeverity(entry) !== "warning") return false;
      if (!normalizedQuery) return true;
      return (
        entry.action.toLowerCase().includes(normalizedQuery) ||
        entry.resourceType.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [liveEntries, filter, highRiskOnly, query]);

  const visibleEntries = filteredEntries.slice(
    0,
    expanded ? EXPANDED_VISIBLE_COUNT : DEFAULT_VISIBLE_COUNT
  );

  const investigateCurrentViewHref = useMemo(() => {
    const params = new URLSearchParams();
    const normalizedQuery = query.trim();
    const uniqueActions = Array.from(new Set(filteredEntries.map((entry) => entry.action)));
    const uniqueResources = Array.from(new Set(filteredEntries.map((entry) => entry.resourceType)));

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    } else if (filter !== "all") {
      params.set("q", filter);
    }
    if (uniqueActions.length === 1) {
      params.set("action", uniqueActions[0]);
    }
    if (uniqueResources.length === 1) {
      params.set("resourceType", uniqueResources[0]);
    }
    const qs = params.toString();
    return qs ? `/dashboard/audit?${qs}` : "/dashboard/audit";
  }, [filter, filteredEntries, query]);

  const copyInvestigateLink = async () => {
    try {
      const fullUrl =
        typeof window === "undefined"
          ? investigateCurrentViewHref
          : `${window.location.origin}${investigateCurrentViewHref}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base text-[var(--foreground)] shrink-0">Recent activity</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh((prev) => !prev)}
            >
              Auto refresh: {autoRefresh ? "On" : "Off"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshEntries()} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={copyInvestigateLink}>
              {copiedLink ? "Link copied" : "Copy link"}
            </Button>
            <Link href={investigateCurrentViewHref}>
              <Button type="button" size="sm" variant="outline">
                Investigate ({filteredEntries.length})
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Last updated: {formatAuditTime(lastUpdatedAt)}
          {refreshError ? ` · ${refreshError}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All ({counts.all})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "content" ? "default" : "outline"}
              onClick={() => setFilter("content")}
            >
              Content ({counts.content})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "media" ? "default" : "outline"}
              onClick={() => setFilter("media")}
            >
              Media ({counts.media})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "system" ? "default" : "outline"}
              onClick={() => setFilter("system")}
            >
              System ({counts.system})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={highRiskOnly ? "destructive" : "outline"}
              onClick={() => setHighRiskOnly((prev) => !prev)}
            >
              High risk only
            </Button>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by action or resource"
            className="h-9 w-full min-w-0 sm:w-48"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No activity matches the current filter.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {visibleEntries.map((item) => (
                (() => {
                  const severity = classifySeverity(item);
                  return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 transition-colors duration-150 hover:border-[oklch(0.91_0.012_255)]"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm text-[var(--muted-foreground)]">
                      <span className="font-medium text-[var(--foreground)]">{item.action}</span>
                      {" · "}
                      <span className="text-[var(--muted-foreground)]">{item.resourceType}</span>
                      <span
                        className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                          severity === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {severity === "warning" ? "Warning" : "Normal"}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatAuditTime(item.createdAt)}</p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/dashboard/audit?q=${encodeURIComponent(item.action)}&action=${encodeURIComponent(item.action)}`}
                    >
                      <Button type="button" size="sm" variant="outline">
                        Investigate
                      </Button>
                    </Link>
                  </div>
                </li>
                  );
                })()
              ))}
            </ul>
            {filteredEntries.length > DEFAULT_VISIBLE_COUNT ? (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? "Show less" : `Show more (${filteredEntries.length - DEFAULT_VISIBLE_COUNT})`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
