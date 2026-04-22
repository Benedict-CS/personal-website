"use client";

type DailyTrendPoint = {
  day: string;
  views: number;
  cvDownloads: number;
  leads: number;
};

type AnalyticsTrendChartProps = {
  points: DailyTrendPoint[];
};

type TrendDisplayMode = "daily" | "weekly" | "monthly";

type TrendDisplayPoint = {
  key: string;
  label: string;
  views: number;
  cvDownloads: number;
  leads: number;
};

function toISODate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function parseISODate(input: string): Date | null {
  const d = new Date(`${input}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // Sun=0, Mon=1
  const offset = (day + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return d;
}

export function buildTrendChartDisplay(points: DailyTrendPoint[]): {
  mode: TrendDisplayMode;
  rows: TrendDisplayPoint[];
} {
  if (points.length <= 45) {
    return {
      mode: "daily",
      rows: points.map((point) => ({
        key: point.day,
        label: point.day.slice(5),
        views: point.views,
        cvDownloads: point.cvDownloads,
        leads: point.leads,
      })),
    };
  }

  const mode: TrendDisplayMode = points.length > 120 ? "monthly" : "weekly";
  const grouped = new Map<
    string,
    {
      start: string;
      end: string;
      views: number;
      cvDownloads: number;
      leads: number;
    }
  >();

  for (const point of points) {
    const date = parseISODate(point.day);
    if (!date) continue;
    const start = mode === "monthly"
      ? toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
      : toISODate(startOfWeekMonday(date));
    const end = mode === "monthly"
      ? toISODate(endOfMonth(date))
      : toISODate(new Date(startOfWeekMonday(date).getTime() + 6 * 24 * 60 * 60 * 1000));
    const current = grouped.get(start) ?? {
      start,
      end: point.day,
      views: 0,
      cvDownloads: 0,
      leads: 0,
    };
    current.end = current.end > point.day ? current.end : point.day;
    current.views += point.views;
    current.cvDownloads += point.cvDownloads;
    current.leads += point.leads;
    grouped.set(start, current);
  }

  const rows = Array.from(grouped.values())
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((bucket) => ({
      key: bucket.start,
      label:
        mode === "monthly"
          ? bucket.start.slice(0, 7)
          : `${bucket.start.slice(5)}~${bucket.end.slice(5)}`,
      views: bucket.views,
      cvDownloads: bucket.cvDownloads,
      leads: bucket.leads,
    }));

  return { mode, rows };
}

export function AnalyticsTrendChart({ points }: AnalyticsTrendChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No trend data in this period.</p>;
  }

  const display = buildTrendChartDisplay(points);
  const maxViews = Math.max(1, ...display.rows.map((point) => point.views));
  const maxConversions = Math.max(
    1,
    ...display.rows.map((point) => Math.max(point.cvDownloads, point.leads))
  );

  return (
    <div className="space-y-3">
      {display.mode !== "daily" ? (
        <p className="text-xs text-muted-foreground">
          Showing {display.mode === "weekly" ? "weekly" : "monthly"} buckets for readability.
        </p>
      ) : null}
      <div className="grid gap-1">
        {display.rows.map((point) => {
          const viewWidth = Math.max(2, Math.round((point.views / maxViews) * 100));
          const cvWidth = point.cvDownloads > 0 ? Math.max(2, Math.round((point.cvDownloads / maxConversions) * 100)) : 0;
          const leadWidth = point.leads > 0 ? Math.max(2, Math.round((point.leads / maxConversions) * 100)) : 0;

          return (
            <div key={point.key} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{point.label}</span>
              <div className="space-y-1">
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-slate-800 transition-all" style={{ width: `${viewWidth}%` }} />
                </div>
                <div className="flex gap-1">
                  <div className="h-1.5 rounded bg-emerald-500/25" style={{ width: `${cvWidth}%` }} />
                  <div className="h-1.5 rounded bg-indigo-500/25" style={{ width: `${leadWidth}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-slate-800" /> Views
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-emerald-500" /> CV downloads
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-indigo-500" /> Leads
        </span>
      </div>
    </div>
  );
}
