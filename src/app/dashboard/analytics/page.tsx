"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/contexts/toast-context";
import { ChevronDown, Download, Server } from "lucide-react";
import {
  ANALYTICS_OPT_OUT_STORAGE_KEY,
  setAnalyticsOptOutInBrowser,
  syncAnalyticsOptOutCookie,
} from "@/lib/analytics-client-opt-out";
import { AnalyticsPathBars } from "@/components/analytics-path-bars";
import { AnalyticsStatsSkeleton } from "@/components/dashboard/analytics-stats-skeleton";
import { DashboardPageHeader, dashboardMetricValueClassName } from "@/components/dashboard/dashboard-ui";

type Stats = {
  total: number;
  byPath: { path: string; count: number }[];
  byIP: { ip: string; count: number; lastVisit?: string }[];
  byCountry?: { country: string; count: number }[];
  byReferrer?: { referrer: string; count: number }[];
  topBlogPosts?: { title: string; slug: string; viewCount: number }[];
  avgDurationSeconds?: number | null;
  durationSampleCount?: number;
  cvDownloads?: number;
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
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(() => todayStr());
  const [filterIP, setFilterIP] = useState<string>("");
  /** When true, stats API includes unknown / 127.0.0.1 / private LAN IPs (default off). */
  const [includeDevIps, setIncludeDevIps] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [clearBefore, setClearBefore] = useState("");
  const [clearOnDate, setClearOnDate] = useState("");
  const [clearByIP, setClearByIP] = useState("");
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  type ClearConfirmType = "before" | "onDate" | "byIP" | "all";
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
    fetch(`/api/analytics/stats?${params}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.error || `Error ${r.status}`);
          return null;
        }
        return r.json();
      })
      .then(setStats)
      .catch((e) => {
        setError(e?.message || "Network error");
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [from, to, filterIP, includeDevIps, refreshKey]);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; db?: string; uptimeSeconds?: number; appVersion?: string; node?: string }) => {
        setHealthSnapshot({
          ok: !!d.ok,
          db: typeof d.db === "string" ? d.db : "—",
          uptimeSeconds: typeof d.uptimeSeconds === "number" ? d.uptimeSeconds : undefined,
          appVersion: typeof d.appVersion === "string" ? d.appVersion : undefined,
          node: typeof d.node === "string" ? d.node : undefined,
          loaded: true,
        });
      })
      .catch(() => {
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
      const res = await fetch("/api/analytics/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before: date }),
      });
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
      setClearMessage((e as Error)?.message || "Request failed");
      toast((e as Error)?.message || "Request failed", "error");
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
      const res = await fetch("/api/analytics/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
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
      setClearMessage((e as Error)?.message || "Request failed");
      toast((e as Error)?.message || "Request failed", "error");
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
      const res = await fetch("/api/analytics/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onDate: date }),
      });
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
      setClearMessage((e as Error)?.message || "Request failed");
      toast((e as Error)?.message || "Request failed", "error");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearAll = () => {
    if (!clearAllConfirm) return;
    setClearConfirm({ type: "all" });
  };

  const doClearAll = async () => {
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetch("/api/analytics/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmAll: true }),
      });
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
      setClearMessage((e as Error)?.message || "Request failed");
      toast((e as Error)?.message || "Request failed", "error");
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
          : clearConfirm?.type === "all"
            ? "Delete all analytics records?"
            : "";
  const clearConfirmDesc = clearConfirm ? "This cannot be undone." : "";

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
          else if (c.type === "all") void doClearAll();
        }}
      />
      <DashboardPageHeader
        title="Analytics"
        description="Traffic, paths, application health, privacy filters, and CSV exports."
      />

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
            Application health
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground">
          {!healthSnapshot.loaded ? (
            <p className="text-muted-foreground">Checking /api/health…</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <p>
                <span className="text-muted-foreground">Database:</span>{" "}
                <span
                  className={
                    healthSnapshot.db === "ok" ? "font-medium text-emerald-700" : "font-medium text-amber-800"
                  }
                >
                  {healthSnapshot.db}
                </span>
              </p>
              {healthSnapshot.uptimeSeconds != null && (
                <p>
                  <span className="text-muted-foreground">Process uptime:</span>{" "}
                  <span className="font-mono text-foreground">
                    {Math.floor(healthSnapshot.uptimeSeconds / 3600)}h{" "}
                    {Math.floor((healthSnapshot.uptimeSeconds % 3600) / 60)}m
                  </span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Deployment:</span>{" "}
                {healthSnapshot.appVersion ? (
                  <span className="font-mono text-xs text-foreground break-all">{healthSnapshot.appVersion}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
              {healthSnapshot.node ? (
                <p>
                  <span className="text-muted-foreground">Node.js:</span>{" "}
                  <span className="font-mono text-xs text-foreground">{healthSnapshot.node}</span>
                </p>
              ) : null}
              <p className="text-muted-foreground">
                Readiness / DB:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/health</code>
                {" · "}
                Cheap liveness (no DB):{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/live</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/50">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">Privacy, filters &amp; opt-out</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Collapsed by default · how noise is filtered · exclude this browser from counts
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {excludeThisBrowser ? (
                <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 sm:inline">
                  Browser excluded
                </span>
              ) : null}
              <ChevronDown
                className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </div>
          </summary>
          <CardContent className="space-y-3 border-t border-border/80 pt-4 text-sm text-foreground">
            <p>
              Totals and breakdowns exclude obvious security probes (for example{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">/.env</code>,{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">/.git</code>, case variants) and known scanner user agents. Tools that spoof a normal
              Chrome user-agent can still appear; crawlers may appear. By default, reported stats also omit{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">unknown</code>, loopback, and private LAN IPs (enable &quot;Include local &amp; unknown
              IPs&quot; above the chart to see them). IP shown as &quot;unknown&quot; means the edge could not read a client IP from headers.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Client IP required to log:</span> page views are not written when the edge cannot determine a client IP
              (no <span className="font-mono text-xs">X-Forwarded-For</span> / trusted proxy headers). Configure your reverse proxy in production so real visits are
              recorded.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Data retention:</span> nothing is deleted automatically. Old probe rows stay in the database until you use
              Clear history below. New filter rules only change <span className="font-medium">reported</span> totals, not raw row deletion.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">CV downloads:</span> same filters as other metrics. If your IP is listed under excluded IPs below, your own
              downloads are not counted.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3">
              <input
                type="checkbox"
                className="mt-1 rounded border-input"
                checked={excludeThisBrowser}
                onChange={(e) => {
                  const on = e.target.checked;
                  setExcludeThisBrowser(on);
                  setAnalyticsOptOutInBrowser(on);
                  toast(
                    on
                      ? "This browser will no longer record page views or duration."
                      : "This browser will record analytics again.",
                    "success"
                  );
                }}
              />
              <span>
                <span className="font-medium text-foreground">Do not count visits from this browser</span>
                <span className="mt-1 block text-muted-foreground">
                  Sets localStorage and a cookie so both the in-browser beacon and edge middleware skip logging. Reload or open a new tab on the public site for
                  the cookie to apply on the next navigation. For fixed IPs, also set{" "}
                  <code className="rounded bg-muted px-1 font-mono text-xs">ANALYTICS_EXCLUDED_IPS</code> in environment.
                </span>
              </span>
            </label>
          </CardContent>
        </details>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
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
            <label className="block text-sm font-medium text-foreground mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Filter by IP</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="e.g. 140.113.128.3"
                value={filterIP}
                onChange={(e) => setFilterIP(e.target.value)}
                className="rounded border border-input px-3 py-2 text-sm font-mono w-40"
              />
              {filterIP.trim() && (
                <Button variant="ghost" size="sm" onClick={() => setFilterIP("")}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground max-w-md">
            <input
              type="checkbox"
              className="rounded border-input"
              checked={includeDevIps}
              onChange={(e) => setIncludeDevIps(e.target.checked)}
              disabled={!!filterIP.trim()}
            />
            <span>
              Include local &amp; unknown IPs in stats{" "}
              <span className="text-muted-foreground">(127.0.0.1, RFC1918, unknown — off by default)</span>
            </span>
          </label>
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
      </div>

      {loading && <AnalyticsStatsSkeleton />}
      {!loading && stats && (
        <>
          {stats.filterIP && (
            <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              Showing only IP: <strong className="font-mono">{stats.filterIP}</strong> — all views and paths for this visitor.{" "}
              <button type="button" onClick={() => setFilterIP("")} className="text-blue-600 hover:underline">Clear filter</button>
            </p>
          )}
          {stats.excludedIPs && stats.excludedIPs.length > 0 && !stats.filterIP && (
            <p className="text-sm text-muted-foreground">
              Excluded IPs (not counted): {stats.excludedIPs.join(", ")}
            </p>
          )}
          {stats.excludingDevIps && !stats.filterIP && (
            <p className="text-sm text-muted-foreground">
              Stats omit <span className="font-mono text-xs">unknown</span>, loopback, and private LAN IPs unless you enable the checkbox above.
            </p>
          )}
          {stats.total === 0 && !stats.filterIP && (
            <div
              className="rounded-lg border border-dashed border-border bg-muted/60 px-4 py-5 text-center text-sm text-muted-foreground"
              role="status"
            >
              <p className="font-medium text-foreground">No page views in this date range</p>
              <p className="mt-1">
                Traffic appears after visitors load public pages while <code className="rounded bg-card px-1 text-xs">ANALYTICS_SECRET</code>{" "}
                is set. Widen the range, remove IP filters, or confirm middleware is logging views. If you only tested locally, turn on{" "}
                <span className="font-medium">Include local &amp; unknown IPs</span> to see those rows.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                <CardTitle>Unique IPs (top list)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={dashboardMetricValueClassName()}>{stats.byIP.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Distinct IPs in the grouped table below (capped at 50).</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>CV downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={dashboardMetricValueClassName()}>{stats.cvDownloads ?? 0}</p>
                {(stats.cvDownloads ?? 0) === 0 && stats.excludedIPs && stats.excludedIPs.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Zero can mean no downloads in this range, or every hit was from an excluded IP (yours may be listed above).
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg. time on page</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {stats.avgDurationSeconds != null
                    ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${Math.round(stats.avgDurationSeconds % 60)}s`
                    : "—"}
                </p>
                {stats.durationSampleCount != null && stats.durationSampleCount > 0 && (
                  <p className="text-xs text-muted-foreground">from {stats.durationSampleCount} sessions</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Access denied (403)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={dashboardMetricValueClassName()}>{stats.accessBlockTotal ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Blocked requests in date range (one log row per IP per minute). Rows for{" "}
                  <code className="rounded bg-muted px-1 text-xs">/api/analytics/access-block-log</code> are omitted — they are
                  artifacts of loading this dashboard, not public traffic.
                </p>
              </CardContent>
            </Card>
          </div>
          {stats.byCountry && stats.byCountry.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By country</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {stats.byCountry.map((c) => (
                    <span key={c.country} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
                      <span className="font-medium text-foreground">{c.country}</span>
                      <span className="text-muted-foreground">{c.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {stats.topBlogPosts && stats.topBlogPosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Blog posts by view count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm min-w-[280px]">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Post</th>
                        <th className="py-2">Views</th>
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
              </CardContent>
            </Card>
          )}
          {stats.byReferrer && stats.byReferrer.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By referrer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm min-w-[200px]">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Referrer</th>
                        <th className="py-2">Views</th>
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
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By path</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsPathBars rows={stats.byPath} />
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm min-w-[200px]">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Path</th>
                        <th className="py-2">Views</th>
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
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By IP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm min-w-[280px]">
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
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => setFilterIP(p.ip)}
                              className="font-mono text-foreground hover:text-primary hover:underline text-left"
                              title="Show only this IP"
                            >
                              {p.ip}
                            </button>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {p.lastVisit ? formatDate(p.lastVisit) : "—"}
                          </td>
                          <td className="py-2 pr-4">{p.count}</td>
                          <td className="py-2">
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
          <Card>
            <CardHeader>
              <CardTitle>Recent views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm min-w-[320px]">
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
                        <td className="py-2 pr-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                        <td className="py-2 pr-4 font-mono">{r.path}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {[r.country, r.city].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground break-all max-w-[180px]">
                          {r.referrer || "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs break-all max-w-[200px]" title={r.userAgent || ""}>
                          {r.userAgent ? `${r.userAgent.slice(0, 80)}${r.userAgent.length > 80 ? "…" : ""}` : "—"}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setFilterIP(r.ip)}
                            className="font-mono text-foreground hover:text-primary hover:underline text-left"
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
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Blocked IP log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Logged when the proxy returns 403 for forbidden IPs. Enable with{" "}
                <span className="font-mono text-xs">ANALYTICS_SECRET</span> or{" "}
                <span className="font-mono text-xs">ACCESS_BLOCK_LOG_SECRET</span>. Same filters as the 403 total above (internal
                access-block-log requests are hidden).
              </p>
              {(stats.accessBlockedRecent?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No entries in this range.</p>
              ) : (
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm min-w-[280px]">
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
                          <td className="py-2 pr-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => setFilterIP(r.ip)}
                              className="font-mono text-foreground hover:text-primary hover:underline text-left"
                              title="Filter page views by this IP"
                            >
                              {r.ip}
                            </button>
                          </td>
                          <td className="py-2 pr-4 font-mono text-foreground">{r.path}</td>
                          <td
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
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle>Clear history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Remove page view records and matching blocked-access log rows (same filters). Analytics data is included in
                daily DB backup (backup.sql). Requires login.
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
                      className="rounded border border-input px-3 py-2 text-sm font-mono w-36"
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
                      className="rounded border border-input px-3 py-2 text-sm"
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
                  <label className="block text-sm font-medium text-foreground mb-1">Before date (older than)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearBefore}
                      onChange={(e) => setClearBefore(e.target.value)}
                      className="rounded border border-input px-3 py-2 text-sm"
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={clearLoading || !clearAllConfirm}
                >
                  {clearLoading ? "..." : "Clear all"}
                </Button>
              </div>
              {clearMessage && (
                <p className="text-sm text-muted-foreground">{clearMessage}</p>
              )}
            </CardContent>
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
