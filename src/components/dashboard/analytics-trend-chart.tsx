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

export function AnalyticsTrendChart({ points }: AnalyticsTrendChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No trend data in this period.</p>;
  }

  const maxViews = Math.max(1, ...points.map((point) => point.views));
  const maxConversions = Math.max(1, ...points.map((point) => Math.max(point.cvDownloads, point.leads)));

  return (
    <div className="space-y-3">
      <div className="grid gap-1">
        {points.map((point) => {
          const viewWidth = Math.max(2, Math.round((point.views / maxViews) * 100));
          const cvWidth = point.cvDownloads > 0 ? Math.max(2, Math.round((point.cvDownloads / maxConversions) * 100)) : 0;
          const leadWidth = point.leads > 0 ? Math.max(2, Math.round((point.leads / maxConversions) * 100)) : 0;

          return (
            <div key={point.day} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{point.day.slice(5)}</span>
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
