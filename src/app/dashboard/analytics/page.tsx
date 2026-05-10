"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/contexts/toast-context";
import { ChevronDown, Download } from "lucide-react";
import {
  ANALYTICS_OPT_OUT_STORAGE_KEY,
  setAnalyticsOptOutInBrowser,
  syncAnalyticsOptOutCookie,
} from "@/lib/analytics-client-opt-out";
import { AnalyticsPathBars } from "@/components/analytics-path-bars";
import { AnalyticsStatsSkeleton } from "@/components/dashboard/analytics-stats-skeleton";
import {
  DashboardEmptyState,
  DashboardPageHeader,
  dashboardMetricValueClassName,
  dashboardSubtleActionButtonClassName,
} from "@/components/dashboard/dashboard-ui";
import { DASHBOARD_FORM_LABEL_CLASS } from "@/components/dashboard/dashboard-form-classes";
import { buildAnalyticsInsight } from "@/lib/analytics-insight";
import { AnalyticsTrendChart } from "@/components/dashboard/analytics-trend-chart";
import { buildAnalyticsAnomalyCallouts } from "@/lib/analytics-anomaly";
import { buildAnalyticsTrendInterpretationCards } from "@/lib/analytics-trend-interpretation";
import { TooltipHint } from "@/components/ui/tooltip-hint";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_INTERNAL_FETCH, fetchWithRetry, formatDashboardFetchFailure } from "@/lib/self-healing-fetch";

const analyticsMutationFetch = { ...DASHBOARD_INTERNAL_FETCH, retries: 0 };

type Stats = {
  total: number;
  byPath: { path: string; count: number }[];
  byIP: { ip: string; count: number; lastVisit?: string }[];
  byCountry?: { country: string; count: number }[];
  byReferrer?: { referrer: string; count: number }[];
  byReferrerGroup?: { group: string; count: number }[];
  topBlogPosts?: { title: string; slug: string; viewCount: number }[];
  topEngagedContent?: {
    title: string;
    slug: string;
    views: number;
    avgDurationSeconds: number;
    engagementScore: number;
  }[];
  avgDurationSeconds?: number | null;
  durationSampleCount?: number;
  cvDownloads?: number;
  leadGenerated?: number;
  uniqueVisitors?: number;
  conversionFunnel?: {
    visitors: number;
    cvDownloads: number;
    leads: number;
  };
  trendByDay?: {
    day: string;
    views: number;
    cvDownloads: number;
    leads: number;
  }[];
  recent: {
    path: string;
    ip: string;
    country?: string | null;
    city?: string | null;
    durationSeconds?: number | null;
    referrer?: string | null;
    userAgent?: string | null;
    createdAt: string;
  }[];
  accessBlockTotal?: number;
  accessBlockedRecent?: {
    ip: string;
    path: string;
    userAgent: string | null;
    createdAt: string;
  }[];
  filterIP?: string;
  /** When true, stats omit unknown / loopback / RFC1918 (unless Include dev IPs is on). */
  excludingDevIps?: boolean;
  excludedIPs?: string[];
};

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

function parseDateOnly(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftDate(input: Date, dayOffset: number): Date {
  const next = new Date(input);
  next.setDate(next.getDate() + dayOffset);
  return next;
}

function buildPreviousRange(from: string, to: string): { from: string; to: string } | null {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (!fromDate || !toDate || toDate.getTime() < fromDate.getTime()) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1;
  const prevTo = shiftDate(fromDate, -1);
  const prevFrom = shiftDate(prevTo, -(spanDays - 1));
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}

function formatSignedDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}`;
}

function escapeCsvCell(s: string | number | null | undefined): string {
  const raw = String(s ?? "");
  if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function exportStatsToCsv(stats: Stats, from: string, to: string) {
  const rows: string[] = [];
  rows.push("path,ip,country,city,duration_seconds,referrer,user_agent,created_at");
  for (const r of stats.recent) {
    rows.push([
      escapeCsvCell(r.path),
      escapeCsvCell(r.ip),
      escapeCsvCell(r.country),
      escapeCsvCell(r.city),
      escapeCsvCell(r.durationSeconds ?? ""),
      escapeCsvCell(r.referrer),
      escapeCsvCell(r.userAgent),
      escapeCsvCell(r.createdAt),
    ].join(","));
  }
  rows.push("");
  rows.push("path,count");
  for (const p of stats.byPath) {
    rows.push([escapeCsvCell(p.path), escapeCsvCell(p.count)].join(","));
  }
  if (stats.byReferrer?.length) {
    rows.push("");
    rows.push("referrer,count");
    for (const r of stats.byReferrer) {
      rows.push([escapeCsvCell(r.referrer), escapeCsvCell(r.count)].join(","));
    }
  }
  if (stats.topBlogPosts?.length) {
    rows.push("");
    rows.push("title,view_count");
    for (const p of stats.topBlogPosts) {
      rows.push([escapeCsvCell(p.title), escapeCsvCell(p.viewCount)].join(","));
    }
  }
  rows.push("");
  rows.push("ip,count,last_visit");
  for (const b of stats.byIP) {
    rows.push([escapeCsvCell(b.ip), escapeCsvCell(b.count), escapeCsvCell(b.lastVisit)].join(","));
  }
  if (stats.accessBlockedRecent?.length) {
    rows.push("");
    rows.push("blocked_time,blocked_ip,blocked_path,blocked_user_agent");
    for (const r of stats.accessBlockedRecent) {
      rows.push(
        [
          escapeCsvCell(r.createdAt),
          escapeCsvCell(r.ip),
          escapeCsvCell(r.path),
          escapeCsvCell(r.userAgent),
        ].join(",")
      );
    }
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
  type AnalyticsViewMode = "essential" | "full";
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(() => todayStr());
  const [filterIP, setFilterIP] = useState<string>("");
  /** When true, stats API includes unknown / 127.0.0.1 / private LAN IPs (default off). */
  const [includeDevIps, setIncludeDevIps] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previousPeriodStats, setPreviousPeriodStats] = useState<Stats | null>(null);
  const [previousPeriodRange, setPreviousPeriodRange] = useState<{ from: string; to: string } | null>(null);
  const [loadingPreviousPeriod, setLoadingPreviousPeriod] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [clearBefore, setClearBefore] = useState("");
  const [clearOnDate, setClearOnDate] = useState("");
  const [clearNoiseDate, setClearNoiseDate] = useState("");
  const [clearByIP, setClearByIP] = useState("");
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("essential");
  type ClearConfirmType = "before" | "onDate" | "byIP" | "tagPrefetchNoise" | "all";
  const [clearConfirm, setClearConfirm] = useState<{ type: ClearConfirmType; value?: string } | null>(null);
  const [excludeThisBrowser, setExcludeThisBrowser] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<{
    ok: boolean;
    db: string;
    uptimeSeconds?: number;
    appVersion?: string;
    node?: string;
    loaded: boolean;
  }>({ ok: false, db: "—", loaded: false });
  const [healthFetchError, setHealthFetchError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const on = typeof window !== "undefined" && localStorage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY) === "1";
      setExcludeThisBrowser(!!on);
      if (on) syncAnalyticsOptOutCookie(true);
    } catch {
      setExcludeThisBrowser(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (filterIP.trim()) params.set("ip", filterIP.trim());
    if (includeDevIps) params.set("includeDevIps", "1");
    setLoading(true);
    setError(null);
    fetchWithRetry(`/api/analytics/stats?${params}`, { credentials: "include" }, DASHBOARD_INTERNAL_FETCH)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.error || `Error ${r.status}`);
          return null;
        }
        return r.json();
      })
      .then((payload: Stats | null) => {
        setStats(payload);
        if (!payload || filterIP.trim()) {
          setPreviousPeriodStats(null);
          setPreviousPeriodRange(null);
          return;
        }
        const previousRange = buildPreviousRange(from, to);
        if (!previousRange) {
          setPreviousPeriodStats(null);
          setPreviousPeriodRange(null);
          return;
        }
        const previousParams = new URLSearchParams({
          from: previousRange.from,
          to: previousRange.to,
        });
        if (includeDevIps) previousParams.set("includeDevIps", "1");
        setLoadingPreviousPeriod(true);
        setPreviousPeriodRange(previousRange);
        void fetchWithRetry(
          `/api/analytics/stats?${previousParams.toString()}`,
          { credentials: "include" },
          DASHBOARD_INTERNAL_FETCH,
        )
          .then(async (response) => {
            if (!response.ok) return null;
            return (await response.json().catch(() => null)) as Stats | null;
          })
          .then((previousPayload) => setPreviousPeriodStats(previousPayload))
          .catch(() => setPreviousPeriodStats(null))
          .finally(() => setLoadingPreviousPeriod(false));
      })
      .catch((e) => {
        setError(formatDashboardFetchFailure(e));
        setStats(null);
        setPreviousPeriodStats(null);
        setPreviousPeriodRange(null);
      })
      .finally(() => setLoading(false));
  }, [from, to, filterIP, includeDevIps, refreshKey]);

  useEffect(() => {
    setHealthFetchError(null);
    fetchWithRetry("/api/health", { cache: "no-store" }, DASHBOARD_INTERNAL_FETCH)
      .then((r) => r.json())
      .then((d: { ok?: boolean; db?: string; uptimeSeconds?: number; appVersion?: string; node?: string }) => {
        setHealthFetchError(null);
        setHealthSnapshot({
          ok: !!d.ok,
          db: typeof d.db === "string" ? d.db : "—",
          uptimeSeconds: typeof d.uptimeSeconds === "number" ? d.uptimeSeconds : undefined,
          appVersion: typeof d.appVersion === "string" ? d.appVersion : undefined,
          node: typeof d.node === "string" ? d.node : undefined,
          loaded: true,
        });
      })
      .catch((e) => {
        setHealthFetchError(formatDashboardFetchFailure(e));
        setHealthSnapshot({ ok: false, db: "unreachable", loaded: true });
      });
  }, [refreshKey]);

  const handleClearBefore = async () => {
    if (!clearBefore.trim()) return;
    setClearConfirm({ type: "before", value: clearBefore.trim() });
  };

  const doClearBefore = async (date: string) => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ before: date }),
        },
        analyticsMutationFetch,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        return;
      }
      const ab = typeof data.accessBlockDeleted === "number" ? data.accessBlockDeleted : 0;
      setClearMessage(
        `Deleted ${data.deleted ?? 0} page view(s)${ab ? ` and ${ab} blocked-access log row(s)` : ""} before ${date}.`
      );
      setClearBefore("");
      setRefreshKey((k) => k + 1);
      toast(
        `Deleted ${data.deleted ?? 0} page view(s)${
          typeof data.accessBlockDeleted === "number" && data.accessBlockDeleted > 0
            ? `, ${data.accessBlockDeleted} block log(s)`
            : ""
        }.`,
        "success"
      );
    } catch (e) {
      const msg = formatDashboardFetchFailure(e);
      setClearMessage(msg);
      toast(msg, "error");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearByIP = async (ipToDelete: string) => {
    const ip = (ipToDelete || clearByIP).trim();
    if (!ip) return;
    setClearConfirm({ type: "byIP", value: ip });
  };

  const doClearByIP = async (ip: string) => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip }),
        },
        analyticsMutationFetch,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        toast(data.error || `Error ${res.status}`, "error");
        return;
      }
      const ab = typeof data.accessBlockDeleted === "number" ? data.accessBlockDeleted : 0;
      setClearMessage(
        `Deleted ${data.deleted ?? 0} page view(s)${ab ? ` and ${ab} blocked-access log row(s)` : ""} for IP ${ip}.`
      );
      setClearByIP("");
      setRefreshKey((k) => k + 1);
      toast(
        `Deleted ${data.deleted ?? 0} page view(s)${
          typeof data.accessBlockDeleted === "number" && data.accessBlockDeleted > 0
            ? `, ${data.accessBlockDeleted} block log(s)`
            : ""
        } for IP.`,
        "success"
      );
    } catch (e) {
      const msg = formatDashboardFetchFailure(e);
      setClearMessage(msg);
      toast(msg, "error");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearOnDate = () => {
    if (!clearOnDate.trim()) return;
    setClearConfirm({ type: "onDate", value: clearOnDate.trim() });
  };

  const doClearOnDate = async (date: string) => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onDate: date }),
        },
        analyticsMutationFetch,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        toast(data.error || `Error ${res.status}`, "error");
        return;
      }
      const ab = typeof data.accessBlockDeleted === "number" ? data.accessBlockDeleted : 0;
      setClearMessage(
        `Deleted ${data.deleted ?? 0} page view(s)${ab ? ` and ${ab} blocked-access log row(s)` : ""} on ${date}.`
      );
      setClearOnDate("");
      setRefreshKey((k) => k + 1);
      toast(
        `Deleted ${data.deleted ?? 0} page view(s)${
          typeof data.accessBlockDeleted === "number" && data.accessBlockDeleted > 0
            ? `, ${data.accessBlockDeleted} block log(s)`
            : ""
        }.`,
        "success"
      );
    } catch (e) {
      const msg = formatDashboardFetchFailure(e);
      setClearMessage(msg);
      toast(msg, "error");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearAll = () => {
    if (!clearAllConfirm) return;
    setClearConfirm({ type: "all" });
  };

  const handleClearTagPrefetchNoise = () => {
    setClearConfirm({ type: "tagPrefetchNoise", value: clearNoiseDate.trim() || undefined });
  };

  const doClearTagPrefetchNoise = async (date?: string) => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            date
              ? { cleanupTagPrefetchNoise: true, onDate: date }
              : { cleanupTagPrefetchNoise: true }
          ),
        },
        analyticsMutationFetch,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        toast(data.error || `Error ${res.status}`, "error");
        return;
      }
      const ipCount = typeof data.suspiciousIpCount === "number" ? data.suspiciousIpCount : 0;
      setClearMessage(
        `Deleted ${data.deleted ?? 0} suspected tag-prefetch row(s) from ${ipCount} IP(s)${
          date ? ` on ${date}` : ""
        }.`
      );
      setClearNoiseDate("");
      setRefreshKey((k) => k + 1);
      toast(
        `Deleted ${data.deleted ?? 0} suspected tag-prefetch row(s) from ${ipCount} IP(s).`,
        "success"
      );
    } catch (e) {
      const msg = formatDashboardFetchFailure(e);
      setClearMessage(msg);
      toast(msg, "error");
    } finally {
      setClearLoading(false);
    }
  };

  const doClearAll = async () => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetchWithRetry(
        "/api/analytics/clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmAll: true }),
        },
        analyticsMutationFetch,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        toast(data.error || `Error ${res.status}`, "error");
        return;
      }
      const ab = typeof data.accessBlockDeleted === "number" ? data.accessBlockDeleted : 0;
      setClearMessage(
        `Deleted all: ${data.deleted ?? 0} page view(s)${ab ? ` and ${ab} blocked-access log row(s)` : ""}.`
      );
      setClearAllConfirm(false);
      setRefreshKey((k) => k + 1);
      toast(
        `Deleted all: ${data.deleted ?? 0} page view(s)${
          typeof data.accessBlockDeleted === "number" && data.accessBlockDeleted > 0
            ? `, ${data.accessBlockDeleted} block log(s)`
            : ""
        }.`,
        "success"
      );
    } catch (e) {
      const msg = formatDashboardFetchFailure(e);
      setClearMessage(msg);
      toast(msg, "error");
    } finally {
      setClearLoading(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const clearConfirmTitle =
    clearConfirm?.type === "before"
      ? `Delete all records before ${clearConfirm.value}?`
      : clearConfirm?.type === "onDate"
        ? `Delete all records on ${clearConfirm.value}?`
        : clearConfirm?.type === "byIP"
          ? `Delete all records for IP ${clearConfirm.value}?`
          : clearConfirm?.type === "tagPrefetchNoise"
            ? `Delete suspected tag-prefetch noise${clearConfirm.value ? ` on ${clearConfirm.value}` : ""}?`
          : clearConfirm?.type === "all"
            ? "Delete all analytics records?"
            : "";
  const clearConfirmDesc = clearConfirm ? "This cannot be undone." : "";
  const analyticsInsight = useMemo(() => {
    if (!stats) return null;
    return buildAnalyticsInsight({
      total: stats.total,
      cvDownloads: stats.cvDownloads,
      leadGenerated: stats.leadGenerated,
      byReferrerGroup: stats.byReferrerGroup,
    });
  }, [stats]);
  const analyticsAnomalies = useMemo(() => {
    if (!stats?.trendByDay || stats.trendByDay.length === 0) return [];
    return buildAnalyticsAnomalyCallouts(stats.trendByDay);
  }, [stats?.trendByDay]);
  const trendInterpretationCards = useMemo(() => {
    if (!stats?.trendByDay || stats.trendByDay.length === 0) return [];
    return buildAnalyticsTrendInterpretationCards(stats.trendByDay);
  }, [stats?.trendByDay]);
  const periodDeltaSummary = useMemo(() => {
    if (!stats || !previousPeriodStats) return null;
    const currentVisitors = stats.uniqueVisitors ?? 0;
    const previousVisitors = previousPeriodStats.uniqueVisitors ?? 0;
    const currentCv = stats.cvDownloads ?? 0;
    const previousCv = previousPeriodStats.cvDownloads ?? 0;
    const currentLeads = stats.leadGenerated ?? 0;
    const previousLeads = previousPeriodStats.leadGenerated ?? 0;
    const currentLeadRate = currentCv > 0 ? (currentLeads / currentCv) * 100 : 0;
    const previousLeadRate = previousCv > 0 ? (previousLeads / previousCv) * 100 : 0;
    const previousTopBySlug = new Map(
      (previousPeriodStats.topEngagedContent ?? []).map((row) => [row.slug, row.engagementScore])
    );
    const topMovers = (stats.topEngagedContent ?? [])
      .slice(0, 5)
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        current: row.engagementScore,
        previous: previousTopBySlug.get(row.slug) ?? 0,
      }))
      .map((row) => ({ ...row, delta: row.current - row.previous }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
    return {
      visitors: { current: currentVisitors, previous: previousVisitors },
      cv: { current: currentCv, previous: previousCv },
      leads: { current: currentLeads, previous: previousLeads },
      leadRate: { current: currentLeadRate, previous: previousLeadRate },
      topMovers,
    };
  }, [stats, previousPeriodStats]);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={clearConfirm !== null}
        onClose={() => setClearConfirm(null)}
        title={clearConfirmTitle}
        description={clearConfirmDesc}
        confirmLabel="Delete"
        variant="danger"
        loading={clearLoading}
        onConfirm={() => {
          const c = clearConfirm;
          setClearConfirm(null);
          if (!c) return;
          if (c.type === "before" && c.value) void doClearBefore(c.value);
          else if (c.type === "byIP" && c.value) void doClearByIP(c.value);
          else if (c.type === "onDate" && c.value) void doClearOnDate(c.value);
          else if (c.type === "tagPrefetchNoise") void doClearTagPrefetchNoise(c.value);
          else if (c.type === "all") void doClearAll();
        }}
      />
      <DashboardPageHeader eyebrow="Insights" title="Analytics" description="Totals, visitors, and daily traffic." />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">View</span>
          <Button
            variant={viewMode === "essential" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("essential")}
          >
            Essential
          </Button>
          <Button
            variant={viewMode === "full" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("full")}
          >
            Full
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className={dashboardSubtleActionButtonClassName()}
            onClick={() => {
              setFrom("2026-01-01");
              setTo(todayStr());
            }}
          >
            This year
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={dashboardSubtleActionButtonClassName()}
            onClick={() => {
              setFrom(firstDayOfMonth());
              setTo(todayStr());
            }}
          >
            This month
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={dashboardSubtleActionButtonClassName()}
            onClick={() => {
              setFrom(daysAgo(6));
              setTo(todayStr());
            }}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={dashboardSubtleActionButtonClassName()}
            onClick={() => {
              setFrom(daysAgo(29));
              setTo(todayStr());
            }}
          >
            Last 30 days
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className={`${DASHBOARD_FORM_LABEL_CLASS} mb-1 block`}>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className={`${DASHBOARD_FORM_LABEL_CLASS} mb-1 block`}>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-input px-3 py-2 text-sm"
            />
          </div>
          {stats && !loading && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                exportStatsToCsv(stats, from, to);
                toast("CSV downloaded", "success");
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
        <Card className="border-border bg-muted/40">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              <span>IP filters</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <CardContent className="space-y-3 border-t border-border/80 pt-4">
              <div>
                <label className={`${DASHBOARD_FORM_LABEL_CLASS} mb-1 block`}>Filter by IP</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="e.g. 140.113.128.3"
                    value={filterIP}
                    onChange={(e) => setFilterIP(e.target.value)}
                    className="rounded border border-input px-3 py-2 text-sm font-mono w-44"
                  />
                  {filterIP.trim() ? (
                    <Button variant="ghost" size="sm" onClick={() => setFilterIP("")}>
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={includeDevIps}
                  onChange={(e) => setIncludeDevIps(e.target.checked)}
                  disabled={!!filterIP.trim()}
                />
                <span>Include local &amp; unknown IPs</span>
              </label>
            </CardContent>
          </details>
        </Card>
      </div>

      {loading && <AnalyticsStatsSkeleton />}
      {!loading && stats && (
        <>
          {stats.filterIP && (
            <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              Showing only IP: <strong className="font-mono">{stats.filterIP}</strong> — all views and paths for this visitor.{" "}
              <button
                type="button"
                onClick={() => setFilterIP("")}
                className="rounded-sm px-1 py-0.5 text-blue-600 transition-colors hover:underline active:opacity-70 motion-reduce:transition-none"
              >
                Clear filter
              </button>
            </p>
          )}
          {stats.excludedIPs && stats.excludedIPs.length > 0 && !stats.filterIP && (
            <p className="text-sm text-muted-foreground">
              Excluded IPs (not counted): {stats.excludedIPs.join(", ")}
            </p>
          )}
          {stats.excludingDevIps && !stats.filterIP && (
            <p className="text-sm text-muted-foreground">
              Local / unknown IPs omitted — open <span className="font-medium">IP filters</span> to include.
            </p>
          )}
          {stats.total === 0 && !stats.filterIP && (
            <DashboardEmptyState
              illustration="chart"
              title="No page views in this date range"
              description={
                <>
                  Needs <code className="rounded bg-card px-1 text-xs">ANALYTICS_SECRET</code> and real traffic. Widen dates or open{" "}
                  <span className="font-medium">IP filters</span> to include local/unknown IPs.
                </>
              }
              className="px-4 py-6"
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Total views</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={dashboardMetricValueClassName()}>{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unique visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={dashboardMetricValueClassName()}>{stats.uniqueVisitors ?? 0}</p>
              </CardContent>
            </Card>
          </div>
          {stats.trendByDay && stats.trendByDay.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsTrendChart points={stats.trendByDay} />
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-border bg-muted/40">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>More metrics</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <CardContent className="space-y-6 border-t border-border/80 pt-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Distinct IPs (table)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={dashboardMetricValueClassName()}>{stats.byIP.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 50 in By IP below.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">CV downloads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={dashboardMetricValueClassName()}>{stats.cvDownloads ?? 0}</p>
                      {(stats.cvDownloads ?? 0) === 0 && stats.excludedIPs && stats.excludedIPs.length > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">May be excluded by IP list above.</p>
                      ) : null}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Avg. time on page</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        {stats.avgDurationSeconds != null
                          ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${Math.round(stats.avgDurationSeconds % 60)}s`
                          : "—"}
                      </p>
                      {stats.durationSampleCount != null && stats.durationSampleCount > 0 && (
                        <p className="text-xs text-muted-foreground">n={stats.durationSampleCount}</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={dashboardMetricValueClassName()}>{stats.leadGenerated ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Blocked (403)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={dashboardMetricValueClassName()}>{stats.accessBlockTotal ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Proxy IP blocks; internal log rows hidden.</p>
                    </CardContent>
                  </Card>
                </div>
                {stats.conversionFunnel ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Funnel</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitors</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{stats.conversionFunnel.visitors}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">CV downloads</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{stats.conversionFunnel.cvDownloads}</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.conversionFunnel.visitors > 0
                            ? `${Math.round((stats.conversionFunnel.cvDownloads / stats.conversionFunnel.visitors) * 100)}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{stats.conversionFunnel.leads}</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.conversionFunnel.cvDownloads > 0
                            ? `${Math.round((stats.conversionFunnel.leads / stats.conversionFunnel.cvDownloads) * 100)}% of CV`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {stats.byCountry && stats.byCountry.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">By country</p>
                    <div className="flex flex-wrap gap-3">
                      {stats.byCountry.map((c) => (
                        <span key={c.country} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
                          <span className="font-medium text-foreground">{c.country}</span>
                          <span className="text-muted-foreground">{c.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {stats.topBlogPosts && stats.topBlogPosts.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Blog posts by views</p>
                    <div className="max-h-80 overflow-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Post</th>
                            <th className="py-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topBlogPosts.map((p) => (
                            <tr key={p.slug} className="border-b border-border/70">
                              <td className="py-2 pr-4 text-foreground">{p.title}</td>
                              <td className="py-2 tabular-nums">{p.viewCount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {stats.topEngagedContent && stats.topEngagedContent.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Engagement score</p>
                    <div className="max-h-80 overflow-auto overscroll-x-contain rounded-lg border border-border">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Post</th>
                            <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Views</th>
                            <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Avg. time</th>
                            <th className="py-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topEngagedContent.map((p) => (
                            <tr key={p.slug} className="border-b border-border/70">
                              <td className="py-2 pr-4 text-foreground">{p.title}</td>
                              <td className="py-2 pr-4 tabular-nums">{p.views.toLocaleString()}</td>
                              <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                                {Math.floor(p.avgDurationSeconds / 60)}m {Math.round(p.avgDurationSeconds % 60)}s
                              </td>
                              <td className="py-2 tabular-nums font-medium">{p.engagementScore.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </details>
          </Card>
          {trendInterpretationCards.length > 0 ? (
            <Card className="border-border bg-muted/40">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span>Trend notes</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <CardContent className="border-t border-border/80 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {trendInterpretationCards.map((card) => (
                      <div
                        key={card.title}
                        className={`rounded-lg border p-3 text-sm ${
                          card.tone === "positive"
                            ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                            : card.tone === "caution"
                              ? "border-amber-200 bg-amber-50/80 text-amber-950"
                              : "border-border bg-muted/25 text-foreground"
                        }`}
                      >
                        <p className="font-medium text-foreground">{card.title}</p>
                        <p className="mt-1 text-xs leading-relaxed opacity-90">{card.detail}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </details>
            </Card>
          ) : null}
          {viewMode === "full" &&
          ((stats.byReferrer && stats.byReferrer.length > 0) || (stats.byReferrerGroup && stats.byReferrerGroup.length > 0)) ? (
            <Card className="border-border bg-muted/40">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span>Referrers</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <CardContent className="space-y-6 border-t border-border/80 pt-4">
                  {stats.byReferrer && stats.byReferrer.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">By URL</p>
                      <div className="max-h-64 overflow-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Referrer</th>
                              <th className="py-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Views</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.byReferrer.map((r) => (
                              <tr key={r.referrer} className="border-b border-border/70">
                                <td className="py-2 pr-4 break-all text-foreground">{r.referrer}</td>
                                <td className="py-2 tabular-nums">{r.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                  {stats.byReferrerGroup && stats.byReferrerGroup.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Groups</p>
                      <div className="max-h-64 overflow-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Group</th>
                              <th className="py-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Views</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.byReferrerGroup.map((r) => (
                              <tr key={r.group} className="border-b border-border/70">
                                <td className="py-2 pr-4 text-foreground">{r.group}</td>
                                <td className="py-2 tabular-nums">{r.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </details>
            </Card>
          ) : null}
          <div className={`grid gap-6 ${viewMode === "full" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            {viewMode === "full" ? (
              <Card className="border-border bg-muted/40">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    <span>By path</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <CardContent className="border-t border-border/80 pt-4">
                    <p className="mb-2 text-xs text-muted-foreground md:hidden">Scroll horizontally for long paths.</p>
                    <AnalyticsPathBars rows={stats.byPath} />
                    <div className="max-h-80 overflow-auto overscroll-x-contain">
                      <table className="w-full text-sm min-w-[280px]">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="py-2 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Path</th>
                            <th className="py-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.byPath.map((p) => (
                            <tr key={p.path} className="border-b border-border/70">
                              <td className="py-2 pr-4 font-mono text-foreground">{p.path}</td>
                              <td className="py-2">{p.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </details>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>By IP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm rwd-table">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">IP</th>
                        <th className="py-2 pr-4">Last visit</th>
                        <th className="py-2 pr-4">Views</th>
                        <th className="py-2 w-16"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byIP.map((p) => (
                        <tr key={p.ip} className="border-b border-border/70">
                          <td data-label="IP" className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => setFilterIP(p.ip)}
                              className="rounded-sm px-0.5 -mx-0.5 text-left font-mono text-foreground transition-colors hover:text-primary hover:underline active:opacity-75 motion-reduce:transition-none"
                              title="Show only this IP"
                            >
                              {p.ip}
                            </button>
                          </td>
                          <td data-label="Last visit" className="py-2 pr-4 text-muted-foreground">
                            {p.lastVisit ? formatDate(p.lastVisit) : "—"}
                          </td>
                          <td data-label="Views" className="py-2 pr-4">{p.count}</td>
                          <td data-label="" className="py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                              onClick={() => handleClearByIP(p.ip)}
                              disabled={clearLoading}
                              title="Delete all records for this IP"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          {viewMode === "full" ? (
            <Card className="border-border bg-muted/40">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span>Recent views</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <CardContent className="border-t border-border/80 pt-4">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm rwd-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Path</th>
                      <th className="py-2 pr-4">Country / City</th>
                      <th className="py-2 pr-4">Duration</th>
                      <th className="py-2 pr-4">Referrer</th>
                      <th className="py-2 pr-4 max-w-[200px]">User-Agent</th>
                      <th className="py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r, i) => (
                      <tr key={i} className="border-b border-border/70">
                        <td data-label="Time" className="py-2 pr-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                        <td data-label="Path" className="py-2 pr-4 font-mono">{r.path}</td>
                        <td data-label="Location" className="py-2 pr-4 text-muted-foreground">
                          {[r.country, r.city].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td data-label="Duration" className="py-2 pr-4 text-muted-foreground">
                          {r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : "—"}
                        </td>
                        <td data-label="Referrer" className="py-2 pr-4 text-muted-foreground break-all max-w-[180px]">
                          {r.referrer || "—"}
                        </td>
                        <td data-label="User-Agent" className="py-2 pr-4 text-muted-foreground text-xs break-all max-w-[200px]" title={r.userAgent || ""}>
                          {r.userAgent ? `${r.userAgent.slice(0, 80)}${r.userAgent.length > 80 ? "…" : ""}` : "—"}
                        </td>
                        <td data-label="IP" className="py-2">
                          <button
                            type="button"
                            onClick={() => setFilterIP(r.ip)}
                            className="rounded-sm px-0.5 -mx-0.5 text-left font-mono text-foreground transition-colors hover:text-primary hover:underline active:opacity-75 motion-reduce:transition-none"
                            title="Show only this IP"
                          >
                            {r.ip}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </CardContent>
              </details>
            </Card>
          ) : null}
          {viewMode === "full" ? (
            <Card className="border-border bg-muted/40">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span>Blocked IP log</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <CardContent className="border-t border-border/80 pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                403s from IP rules. Needs <span className="font-mono">ACCESS_BLOCK_LOG_SECRET</span> or <span className="font-mono">ANALYTICS_SECRET</span>.
              </p>
              {(stats.accessBlockedRecent?.length ?? 0) === 0 ? (
                <DashboardEmptyState
                  illustration="chart"
                  title="No blocked requests in this range"
                  description="No rows matched the current date and filter settings."
                  className="px-4 py-6"
                />
              ) : (
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm rwd-table">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Time</th>
                        <th className="py-2 pr-4">IP</th>
                        <th className="py-2 pr-4">Path</th>
                        <th className="py-2 max-w-[200px]">User-Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.accessBlockedRecent ?? []).map((r, i) => (
                        <tr key={`${r.createdAt}-${r.ip}-${i}`} className="border-b border-border/70">
                          <td data-label="Time" className="py-2 pr-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                          <td data-label="IP" className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => setFilterIP(r.ip)}
                              className="rounded-sm px-0.5 -mx-0.5 text-left font-mono text-foreground transition-colors hover:text-primary hover:underline active:opacity-75 motion-reduce:transition-none"
                              title="Filter page views by this IP"
                            >
                              {r.ip}
                            </button>
                          </td>
                          <td data-label="Path" className="py-2 pr-4 font-mono text-foreground">{r.path}</td>
                          <td
                            data-label="UA"
                            className="py-2 text-muted-foreground text-xs break-all max-w-[200px]"
                            title={r.userAgent || ""}
                          >
                            {r.userAgent
                              ? `${r.userAgent.slice(0, 80)}${r.userAgent.length > 80 ? "…" : ""}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                </CardContent>
              </details>
            </Card>
          ) : null}

          {viewMode === "full" ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-amber-100/80 [&::-webkit-details-marker]:hidden">
                  <span>Clear history</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <CardContent className="space-y-4 border-t border-amber-200/80 pt-4">
              <p className="text-xs text-muted-foreground">
                Deletes page views and matching block logs. Cannot be undone.
              </p>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">By IP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 140.113.128.3"
                      value={clearByIP}
                      onChange={(e) => setClearByIP(e.target.value)}
                      className="rounded-lg border border-input px-3 py-2 text-sm font-mono w-36 shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearByIP(clearByIP)}
                      disabled={clearLoading || !clearByIP.trim()}
                    >
                      {clearLoading ? "..." : "Delete IP"}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">On date (YYYY-MM-DD)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearOnDate}
                      onChange={(e) => setClearOnDate(e.target.value)}
                      className="rounded-lg border border-input px-3 py-2 text-sm shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearOnDate}
                      disabled={clearLoading || !clearOnDate.trim()}
                    >
                      {clearLoading ? "..." : "Delete day"}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tag prefetch noise</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearNoiseDate}
                      onChange={(e) => setClearNoiseDate(e.target.value)}
                      className="rounded-lg border border-input px-3 py-2 text-sm shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearTagPrefetchNoise}
                      disabled={clearLoading}
                      title="Delete suspected prefetch-only /blog/tag/* noise (leave date empty to apply all-time)"
                    >
                      {clearLoading ? "..." : "Clean tag noise"}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Before date (older than)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearBefore}
                      onChange={(e) => setClearBefore(e.target.value)}
                      className="rounded-lg border border-input px-3 py-2 text-sm shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearBefore}
                      disabled={clearLoading || !clearBefore.trim()}
                    >
                      {clearLoading ? "..." : "Clear older"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <label className="flex items-center gap-2 text-sm text-foreground mb-2">
                  <input
                    type="checkbox"
                    checked={clearAllConfirm}
                    onChange={(e) => setClearAllConfirm(e.target.checked)}
                  />
                  I want to delete all analytics records
                </label>
                <TooltipHint label="Deletes all analytics rows in the database. This cannot be undone.">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={clearLoading || !clearAllConfirm}
                  >
                    {clearLoading ? "..." : "Clear all"}
                  </Button>
                </TooltipHint>
              </div>
              {clearMessage && (
                <p className="text-sm text-muted-foreground">{clearMessage}</p>
              )}
                </CardContent>
              </details>
            </Card>
          ) : null}

          <Card className="border-border bg-muted/40">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>Help &amp; maintenance</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <CardContent className="space-y-6 border-t border-border/80 pt-4 text-sm">
                <details className="rounded-lg border border-border bg-card">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    View modes
                  </summary>
                  <div className="border-t border-border px-3 py-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Essential</span> — defaults here: totals, visitors, traffic, By IP.{" "}
                    <span className="font-medium text-foreground">Full</span> — opens logs, paths, referrers, cleanup.
                  </div>
                </details>
                {analyticsInsight || analyticsAnomalies.length > 0 ? (
                  <details className="rounded-lg border border-border bg-card">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      Automated notes
                    </summary>
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      {analyticsInsight ? <p className="text-foreground">{analyticsInsight}</p> : null}
                      {analyticsAnomalies.map((callout) => (
                        <div
                          key={callout.title}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            callout.level === "warning"
                              ? "border-amber-300 bg-amber-50 text-amber-900"
                              : callout.level === "positive"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border-border bg-muted/30 text-foreground"
                          }`}
                        >
                          <p className="font-medium">{callout.title}</p>
                          <p className="text-xs opacity-90">{callout.detail}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                {previousPeriodRange ? (
                  <details className="rounded-lg border border-border bg-card">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      Period comparison
                    </summary>
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <p className="text-xs text-muted-foreground">
                        {from} → {to} vs {previousPeriodRange.from} → {previousPeriodRange.to}
                      </p>
                      {loadingPreviousPeriod ? (
                        <div className="space-y-3" aria-busy="true">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[0, 1, 2, 3].map((key) => (
                              <Skeleton key={key} className="h-[4.5rem] w-full" />
                            ))}
                          </div>
                        </div>
                      ) : periodDeltaSummary ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitors Δ</p>
                              <p className="mt-1 text-xl font-semibold text-foreground">
                                {formatSignedDelta(periodDeltaSummary.visitors.current, periodDeltaSummary.visitors.previous)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">CV Δ</p>
                              <p className="mt-1 text-xl font-semibold text-foreground">
                                {formatSignedDelta(periodDeltaSummary.cv.current, periodDeltaSummary.cv.previous)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads Δ</p>
                              <p className="mt-1 text-xl font-semibold text-foreground">
                                {formatSignedDelta(periodDeltaSummary.leads.current, periodDeltaSummary.leads.previous)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead/CV pp</p>
                              <p className="mt-1 text-xl font-semibold text-foreground">
                                {(periodDeltaSummary.leadRate.current - periodDeltaSummary.leadRate.previous).toFixed(1)}pp
                              </p>
                            </div>
                          </div>
                          {periodDeltaSummary.topMovers.length > 0 ? (
                            <ul className="text-sm text-foreground space-y-1">
                              {periodDeltaSummary.topMovers.map((mover) => (
                                <li key={mover.slug}>
                                  {mover.title}: {mover.delta > 0 ? "+" : ""}
                                  {mover.delta.toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-muted-foreground">Not enough data.</p>
                      )}
                    </div>
                  </details>
                ) : null}
                <details className="rounded-lg border border-border bg-card">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    Privacy &amp; opt-out
                  </summary>
                  <div className="space-y-3 border-t border-border px-3 py-3 text-muted-foreground">
                    <p>
                      Probes and scanner UAs are filtered from totals. Default stats omit unknown / loopback / private IPs unless you use{" "}
                      <span className="font-medium text-foreground">IP filters → Include local &amp; unknown</span>.
                    </p>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-input"
                        checked={excludeThisBrowser}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setExcludeThisBrowser(on);
                          setAnalyticsOptOutInBrowser(on);
                          toast(
                            on ? "This browser will not be counted." : "This browser will be counted again.",
                            "success",
                          );
                        }}
                      />
                      <span className="font-medium text-foreground">Do not count this browser</span>
                    </label>
                  </div>
                </details>
                <details className="rounded-lg border border-border bg-card">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    Application health
                  </summary>
                  <div className="border-t border-border px-3 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-3 h-8 text-xs"
                      onClick={() => setRefreshKey((k) => k + 1)}
                    >
                      Refresh health
                    </Button>
                    {!healthSnapshot.loaded ? (
                      <div className="space-y-2" aria-busy="true">
                        <Skeleton className="h-4 w-52" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {healthFetchError ? (
                          <p className="w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                            {healthFetchError}
                          </p>
                        ) : null}
                        <p>
                          <span className="text-muted-foreground">DB:</span>{" "}
                          <span className={healthSnapshot.db === "ok" ? "font-medium text-emerald-700" : "font-medium text-amber-800"}>
                            {healthSnapshot.db}
                          </span>
                        </p>
                        {healthSnapshot.uptimeSeconds != null && (
                          <p className="text-muted-foreground">
                            Uptime: {Math.floor(healthSnapshot.uptimeSeconds / 3600)}h{" "}
                            {Math.floor((healthSnapshot.uptimeSeconds % 3600) / 60)}m
                          </p>
                        )}
                        {healthSnapshot.appVersion ? (
                          <p className="font-mono text-xs break-all">{healthSnapshot.appVersion}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </details>
              </CardContent>
            </details>
          </Card>
        </>
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
