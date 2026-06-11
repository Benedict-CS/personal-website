"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  Globe2,
  Loader2,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import {
  DashboardEmptyState,
  dashboardMetricValueClassName,
  dashboardSubtleActionButtonClassName,
} from "@/components/dashboard/dashboard-ui";
import { DASHBOARD_FORM_LABEL_CLASS } from "@/components/dashboard/dashboard-form-classes";
import { DASHBOARD_INTERNAL_FETCH, fetchWithRetry } from "@/lib/self-healing-fetch";
import { cn } from "@/lib/utils";

export type AnalyticsStats = {
  total: number;
  byPath: { path: string; count: number }[];
  byIP: { ip: string; count: number; lastVisit?: string; cvDownloads?: number }[];
  byReferrer?: { referrer: string; count: number }[];
  byInternalReferrer?: { referrer: string; label: string; count: number }[];
  byReferrerGroup?: { group: string; count: number }[];
  directVisits?: number;
  avgDurationSeconds?: number | null;
  durationSampleCount?: number;
  cvDownloads?: number;
  uniqueVisitors?: number;
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
  recentCvDownloads?: {
    path: string;
    ip: string;
    country?: string | null;
    city?: string | null;
    referrer?: string | null;
    userAgent?: string | null;
    createdAt: string;
  }[];
};

type Section = "overview" | "visitors";

type VisitRow = AnalyticsStats["recent"][number];

function formatDate(s: string) {
  return new Date(s).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

function formatReferrerLabel(url: string): string {
  if (url.startsWith("android-app://")) {
    if (url.includes("linkedin")) return "LinkedIn app";
    return "Mobile app";
  }
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("google.")) return "Google";
    if (host.includes("github.com")) return "GitHub";
    return host;
  } catch {
    return url.length > 40 ? `${url.slice(0, 40)}…` : url;
  }
}

function channelAccent(group: string): string {
  switch (group) {
    case "Social Media":
      return "bg-blue-500";
    case "Search Engines":
      return "bg-emerald-500";
    case "GitHub":
      return "bg-violet-500";
    case "Direct / Unknown":
      return "bg-muted-foreground/60";
    case "Your site":
      return "bg-amber-500/90";
    default:
      return "bg-primary";
  }
}

function isCvPath(path: string) {
  return path === "/cv.pdf" || path === "/api/cv/download";
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      <p className={cn(dashboardMetricValueClassName(), "mt-2 text-3xl")}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  );
}

function SectionNav({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; label: string }[] = [
    { id: "visitors", label: "Visitors" },
    { id: "overview", label: "Overview" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            section === item.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TrafficSources({ stats }: { stats: AnalyticsStats }) {
  const groups = stats.byReferrerGroup ?? [];
  const external = stats.byReferrer ?? [];
  const internal = stats.byInternalReferrer ?? [];
  const hasAny =
    groups.length > 0 || external.length > 0 || internal.length > 0 || (stats.directVisits ?? 0) > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No referrer data in this range — visitors may have typed your URL or used a bookmark.
      </p>
    );
  }

  const channelTotal = groups.reduce((s, g) => s + g.count, 0) || 1;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">All channels</p>
        <ul className="space-y-3">
          {groups.map((g) => {
            const pct = Math.round((g.count / channelTotal) * 100);
            return (
              <li key={g.group}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{g.group}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {g.count} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", channelAccent(g.group))}
                    style={{ width: `${Math.max(pct, g.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {(stats.directVisits ?? 0) > 0 && !groups.some((g) => g.group === "Direct / Unknown") ? (
          <p className="text-xs text-muted-foreground mt-2">
            {stats.directVisits} visits with no referrer (address bar or bookmark).
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            External sites (LinkedIn, GitHub, Google…)
          </p>
          {external.length === 0 ? (
            <p className="text-sm text-muted-foreground">No off-site referrers in this range.</p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-auto">
              {external.map((r) => (
                <li
                  key={r.referrer}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{formatReferrerLabel(r.referrer)}</p>
                    {r.referrer.startsWith("http") ? (
                      <a
                        href={r.referrer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-[180px]">{r.referrer}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : null}
                  </div>
                  <span className="shrink-0 tabular-nums font-semibold">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            From your site (blog → blog, homepage → post)
          </p>
          {internal.length === 0 ? (
            <p className="text-sm text-muted-foreground">No in-site navigation referrers recorded.</p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-auto">
              {internal.map((r) => (
                <li
                  key={`${r.label}-${r.referrer}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-600/20 bg-amber-500/[0.04] px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={r.referrer}>
                      {r.referrer}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums font-semibold">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitorVisitDetail({ visits }: { visits: VisitRow[] }) {
  if (visits.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">No page views for this visitor in the selected range.</p>;
  }
  return (
    <ul className="divide-y divide-border/60 rounded-lg border border-border/80 bg-muted/20">
      {visits.map((r, i) => (
        <li key={`${r.createdAt}-${r.path}-${i}`} className="px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-sm text-foreground truncate">{r.path}</span>
              {isCvPath(r.path) ? (
                <Badge variant="outline" className="text-emerald-700 border-emerald-600/30 shrink-0 text-xs">
                  CV
                </Badge>
              ) : null}
            </div>
            <time className="text-xs text-muted-foreground shrink-0">{formatDate(r.createdAt)}</time>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {[r.country, r.city].filter(Boolean).length > 0 ? (
              <span>{[r.country, r.city].filter(Boolean).join(" · ")}</span>
            ) : null}
            {r.durationSeconds != null ? (
              <span>
                {Math.floor(r.durationSeconds / 60)}m {r.durationSeconds % 60}s on page
              </span>
            ) : null}
            {r.referrer ? (
              <span className="truncate max-w-[min(100%,320px)]" title={r.referrer}>
                From {formatReferrerLabel(r.referrer)}
              </span>
            ) : (
              <span>Direct / no referrer</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function VisitorList({
  visitors,
  from,
  to,
  seedRecent,
  onDeleteIp,
  deleteLoading,
}: {
  visitors: AnalyticsStats["byIP"];
  from: string;
  to: string;
  seedRecent: VisitRow[];
  onDeleteIp: (ip: string) => void;
  deleteLoading: boolean;
}) {
  const [expandedIp, setExpandedIp] = useState<string | null>(null);
  const [detailVisits, setDetailVisits] = useState<VisitRow[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (ip: string) => {
      const seeded = seedRecent.filter((r) => r.ip === ip);
      setDetailVisits(seeded);
      setDetailLoading(true);
      setDetailError(null);
      try {
        const params = new URLSearchParams({ ip });
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetchWithRetry(
          `/api/analytics/stats?${params}`,
          { credentials: "include" },
          DASHBOARD_INTERNAL_FETCH
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setDetailError(body.error || `Error ${res.status}`);
          return;
        }
        const data = (await res.json()) as AnalyticsStats;
        setDetailVisits(data.recent ?? []);
      } catch {
        setDetailError("Could not load visit history.");
      } finally {
        setDetailLoading(false);
      }
    },
    [from, to, seedRecent]
  );

  const toggleDetail = (ip: string) => {
    if (expandedIp === ip) {
      setExpandedIp(null);
      setDetailVisits(null);
      setDetailError(null);
      return;
    }
    setExpandedIp(ip);
    void loadDetail(ip);
  };

  if (visitors.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No visitors in this date range.</p>;
  }

  return (
    <ul className="divide-y divide-border/70">
      {visitors.map((v) => {
        const isOpen = expandedIp === v.ip;
        return (
          <li key={v.ip} className="py-3.5 px-1">
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-medium text-foreground">{v.ip}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last seen {v.lastVisit ? formatDate(v.lastVisit) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="tabular-nums font-normal h-8 gap-1.5"
                  onClick={() => toggleDetail(v.ip)}
                  aria-expanded={isOpen}
                  aria-controls={`visitor-detail-${v.ip.replace(/\./g, "-")}`}
                >
                  {v.count} {v.count === 1 ? "page view" : "page views"}
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  )}
                </Button>
                {(v.cvDownloads ?? 0) > 0 ? (
                  <Badge className="bg-emerald-600/90 hover:bg-emerald-600/90 text-white font-normal gap-1">
                    <FileDown className="h-3 w-3" aria-hidden />
                    CV
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => onDeleteIp(v.ip)}
                  disabled={deleteLoading}
                  title="Delete all records for this IP"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {isOpen ? (
              <div
                id={`visitor-detail-${v.ip.replace(/\./g, "-")}`}
                className="mt-3 pl-0 sm:pl-1"
              >
                <p className="text-xs font-medium text-muted-foreground mb-2">Visit history</p>
                {detailLoading && !detailVisits?.length ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading…
                  </div>
                ) : detailError ? (
                  <p className="text-sm text-red-600 py-2">{detailError}</p>
                ) : (
                  <VisitorVisitDetail visits={detailVisits ?? []} />
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export type AnalyticsDashboardProps = {
  stats: AnalyticsStats;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPreset: (from: string, to: string) => void;
  onExportCsv: () => void;
  onDeleteIp: (ip: string) => void;
  deleteLoading: boolean;
  presets: { label: string; from: string; to: string }[];
};

export function AnalyticsDashboard({
  stats,
  from,
  to,
  onFromChange,
  onToChange,
  onPreset,
  onExportCsv,
  onDeleteIp,
  deleteLoading,
  presets,
}: AnalyticsDashboardProps) {
  const [section, setSection] = useState<Section>("visitors");
  const visitorCount = stats.byIP.length;
  const avgTime =
    stats.avgDurationSeconds != null
      ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${Math.round(stats.avgDurationSeconds % 60)}s`
      : "—";
  const topPaths = stats.byPath.filter((p) => !isCvPath(p.path)).slice(0, 6);

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className={dashboardSubtleActionButtonClassName()}
                onClick={() => onPreset(p.from, p.to)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className={`${DASHBOARD_FORM_LABEL_CLASS} mb-1 block`}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className={`${DASHBOARD_FORM_LABEL_CLASS} mb-1 block`}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={onExportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats.total === 0 ? (
        <DashboardEmptyState
          illustration="chart"
          title="No real visits in this range"
          description="Widen the date range or check back after someone browses your site."
          className="px-4 py-8"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Page views"
              value={stats.total}
              icon={Eye}
              hint="Excludes bots and homepage-only bounces (no dwell on /)"
            />
            <MetricCard
              label="Visitors"
              value={visitorCount}
              icon={Users}
              hint="Unique IPs; homepage bounces without dwell are excluded"
            />
            <MetricCard
              label="CV downloads"
              value={stats.cvDownloads ?? 0}
              icon={FileDown}
              hint="Each download counts as a page view"
            />
            <MetricCard label="Avg. time on page" value={avgTime} icon={Clock} hint={
              stats.durationSampleCount ? `From ${stats.durationSampleCount} timed visits` : undefined
            } />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionNav section={section} onChange={setSection} />
            <p className="text-xs text-muted-foreground">
              Real browsers · homepage bounces excluded · {formatDate(`${from}T12:00:00`)} – {formatDate(`${to}T12:00:00`)}
            </p>
          </div>

          {section === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    Traffic sources
                  </CardTitle>
                  <CardDescription>
                    LinkedIn/GitHub off-site links, blog navigation on your site, and direct visits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrafficSources stats={stats} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                    Popular pages
                  </CardTitle>
                  <CardDescription>Most viewed paths in this range</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPaths.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No page paths yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {topPaths.map((p) => (
                        <li
                          key={p.path}
                          className="flex justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                        >
                          <span className="font-mono truncate text-foreground">{p.path}</span>
                          <span className="shrink-0 tabular-nums font-medium">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {section === "visitors" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {visitorCount} {visitorCount === 1 ? "visitor" : "visitors"}
                </CardTitle>
                <CardDescription>
                  One row per IP. Click page views to expand visit history (path, time, referrer).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <VisitorList
                  visitors={stats.byIP}
                  from={from}
                  to={to}
                  seedRecent={stats.recent}
                  onDeleteIp={onDeleteIp}
                  deleteLoading={deleteLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
