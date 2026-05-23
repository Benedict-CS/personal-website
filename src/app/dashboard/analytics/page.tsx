"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/contexts/toast-context";
import { AnalyticsStatsSkeleton } from "@/components/dashboard/analytics-stats-skeleton";
import {
  AnalyticsDashboard,
  type AnalyticsStats,
} from "@/components/dashboard/analytics-dashboard";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { DASHBOARD_INTERNAL_FETCH, fetchWithRetry, formatDashboardFetchFailure } from "@/lib/self-healing-fetch";

const analyticsMutationFetch = { ...DASHBOARD_INTERNAL_FETCH, retries: 0 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function escapeCsvCell(s: string | number | null | undefined): string {
  const raw = String(s ?? "");
  if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function exportStatsToCsv(stats: AnalyticsStats, from: string, to: string) {
  const rows: string[] = [];
  rows.push("path,ip,country,city,duration_seconds,referrer,user_agent,created_at");
  for (const r of stats.recent) {
    rows.push(
      [
        escapeCsvCell(r.path),
        escapeCsvCell(r.ip),
        escapeCsvCell(r.country),
        escapeCsvCell(r.city),
        escapeCsvCell(r.durationSeconds ?? ""),
        escapeCsvCell(r.referrer),
        escapeCsvCell(r.userAgent),
        escapeCsvCell(r.createdAt),
      ].join(",")
    );
  }
  const cvRows = stats.recentCvDownloads ?? [];
  if (cvRows.length > 0) {
    rows.push("");
    rows.push("cv_download_path,ip,country,city,referrer,user_agent,created_at");
    for (const r of cvRows) {
      rows.push(
        [
          escapeCsvCell(r.path),
          escapeCsvCell(r.ip),
          escapeCsvCell(r.country),
          escapeCsvCell(r.city),
          escapeCsvCell(r.referrer),
          escapeCsvCell(r.userAgent),
          escapeCsvCell(r.createdAt),
        ].join(",")
      );
    }
  }
  rows.push("");
  rows.push("path,count");
  for (const p of stats.byPath) {
    rows.push([escapeCsvCell(p.path), escapeCsvCell(p.count)].join(","));
  }
  rows.push("");
  rows.push("ip,page_views,cv_downloads,last_visit");
  for (const b of stats.byIP) {
    rows.push(
      [
        escapeCsvCell(b.ip),
        escapeCsvCell(b.count),
        escapeCsvCell(b.cvDownloads ?? 0),
        escapeCsvCell(b.lastVisit),
      ].join(",")
    );
  }
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${from}-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(() => todayStr());
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirmIP, setClearConfirmIP] = useState<string | null>(null);
  const didNoiseCleanup = useRef(false);

  const presets = [
    { label: "This year", from: "2026-01-01", to: todayStr() },
    { label: "This month", from: firstDayOfMonth(), to: todayStr() },
    { label: "Last 7 days", from: daysAgo(6), to: todayStr() },
    { label: "Last 30 days", from: daysAgo(29), to: todayStr() },
  ];

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!didNoiseCleanup.current) {
        didNoiseCleanup.current = true;
        await fetchWithRetry(
          "/api/analytics/clear",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ cleanupJunkAnalytics: true }),
          },
          analyticsMutationFetch
        ).catch(() => undefined);
      }
      if (!active) return;
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      setLoading(true);
      setError(null);
      try {
        const r = await fetchWithRetry(
          `/api/analytics/stats?${params}`,
          { credentials: "include" },
          DASHBOARD_INTERNAL_FETCH
        );
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.error || `Error ${r.status}`);
          setStats(null);
        } else {
          setStats(await r.json());
        }
      } catch (e) {
        setError(formatDashboardFetchFailure(e));
        setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [from, to, refreshKey]);

  const doClearByIP = async (ip: string) => {
    setClearLoading(true);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip }),
          credentials: "include",
        },
        analyticsMutationFetch
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || `Error ${res.status}`, "error");
        return;
      }
      setRefreshKey((k) => k + 1);
      toast(`Removed ${data.deleted ?? 0} record(s) for ${ip}.`, "success");
    } catch (e) {
      toast(formatDashboardFetchFailure(e), "error");
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={clearConfirmIP !== null}
        onClose={() => setClearConfirmIP(null)}
        title={clearConfirmIP ? `Delete all data for ${clearConfirmIP}?` : ""}
        description="Removes every page view and related log for this IP. Cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={clearLoading}
        onConfirm={() => {
          const ip = clearConfirmIP;
          setClearConfirmIP(null);
          if (ip) void doClearByIP(ip);
        }}
      />

      <DashboardPageHeader
        title="Analytics"
        description="Who visited your site and where they came from. Bots and scanner traffic are excluded; homepage-only bounces without dwell time do not count."
      />

      {loading && <AnalyticsStatsSkeleton />}
      {!loading && stats && (
        <AnalyticsDashboard
          stats={stats}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onPreset={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
          onExportCsv={() => {
            exportStatsToCsv(stats, from, to);
            toast("CSV downloaded", "success");
          }}
          onDeleteIp={(ip) => setClearConfirmIP(ip)}
          deleteLoading={clearLoading}
          presets={presets}
        />
      )}
      {!loading && !stats && (
        <p className="text-muted-foreground">
          {error || "Failed to load analytics."}
          {error === "Unauthorized" && " Make sure you are logged in."}
        </p>
      )}
    </div>
  );
}
