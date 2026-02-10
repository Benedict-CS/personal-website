"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Stats = {
  total: number;
  byPath: { path: string; count: number }[];
  byIP: { ip: string; count: number }[];
  byCountry?: { country: string; count: number }[];
  avgDurationSeconds?: number | null;
  durationSampleCount?: number;
  cvDownloads?: number;
  recent: { path: string; ip: string; country?: string | null; city?: string | null; durationSeconds?: number | null; createdAt: string }[];
  filterIP?: string;
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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(() => todayStr());
  const [filterIP, setFilterIP] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [clearBefore, setClearBefore] = useState("");
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (filterIP.trim()) params.set("ip", filterIP.trim());
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/stats?${params}`)
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
  }, [from, to, filterIP, refreshKey]);

  const handleClearBefore = async () => {
    if (!clearBefore.trim()) return;
    setClearLoading(true);
    setClearMessage(null);
    try {
      const res = await fetch("/api/analytics/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before: clearBefore.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(data.error || `Error ${res.status}`);
        return;
      }
      setClearMessage(`Deleted ${data.deleted ?? 0} record(s) before ${clearBefore}.`);
      setClearBefore("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setClearMessage((e as Error)?.message || "Request failed");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!clearAllConfirm) return;
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
        return;
      }
      setClearMessage(`Deleted all: ${data.deleted ?? 0} record(s).`);
      setClearAllConfirm(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setClearMessage((e as Error)?.message || "Request failed");
    } finally {
      setClearLoading(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Analytics</h2>

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
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Filter by IP</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="e.g. 140.113.128.3"
                value={filterIP}
                onChange={(e) => setFilterIP(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm font-mono w-40"
              />
              {filterIP.trim() && (
                <Button variant="ghost" size="sm" onClick={() => setFilterIP("")}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && stats && (
        <>
          {stats.filterIP && (
            <p className="text-sm text-slate-600 bg-slate-100 rounded px-3 py-2">
              Showing only IP: <strong className="font-mono">{stats.filterIP}</strong> — all views and paths for this visitor.{" "}
              <button type="button" onClick={() => setFilterIP("")} className="text-blue-600 hover:underline">Clear filter</button>
            </p>
          )}
          {stats.excludedIPs && stats.excludedIPs.length > 0 && !stats.filterIP && (
            <p className="text-sm text-slate-500">
              Excluded IPs (not counted): {stats.excludedIPs.join(", ")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Total views</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>CV downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.cvDownloads ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg. time on page</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.avgDurationSeconds != null
                    ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${Math.round(stats.avgDurationSeconds % 60)}s`
                    : "—"}
                </p>
                {stats.durationSampleCount != null && stats.durationSampleCount > 0 && (
                  <p className="text-xs text-slate-500">from {stats.durationSampleCount} sessions</p>
                )}
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
                    <span key={c.country} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm">
                      <span className="font-medium text-slate-700">{c.country}</span>
                      <span className="text-slate-500">{c.count}</span>
                    </span>
                  ))}
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
                        <tr key={p.path} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-mono text-slate-700">{p.path}</td>
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
                  <table className="w-full text-sm min-w-[200px]">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">IP</th>
                        <th className="py-2">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byIP.map((p) => (
                        <tr key={p.ip} className="border-b border-slate-100">
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => setFilterIP(p.ip)}
                              className="font-mono text-slate-700 hover:text-blue-600 hover:underline text-left"
                              title="Show only this IP"
                            >
                              {p.ip}
                            </button>
                          </td>
                          <td className="py-2">{p.count}</td>
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
                      <th className="py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-600">{formatDate(r.createdAt)}</td>
                        <td className="py-2 pr-4 font-mono">{r.path}</td>
                        <td className="py-2 pr-4 text-slate-600">
                          {[r.country, r.city].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : "—"}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setFilterIP(r.ip)}
                            className="font-mono text-slate-700 hover:text-blue-600 hover:underline text-left"
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

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle>Clear history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Remove old analytics records to keep the database small. Requires login.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delete records before (YYYY-MM-DD)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearBefore}
                      onChange={(e) => setClearBefore(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm"
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
                <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
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
                <p className="text-sm text-slate-600">{clearMessage}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!loading && !stats && (
        <p className="text-slate-500">
          {error || "Failed to load analytics."}
          {error === "Unauthorized" && " Make sure you are logged in."}
        </p>
      )}
    </div>
  );
}
