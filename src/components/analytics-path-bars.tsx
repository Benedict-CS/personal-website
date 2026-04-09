"use client";

/**
 * Lightweight horizontal bar visualization for path counts (no chart library).
 */
export function AnalyticsPathBars({
  rows,
  maxRows = 14,
}: {
  rows: { path: string; count: number }[];
  maxRows?: number;
}) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, maxRows);
  const maxCount = Math.max(1, ...top.map((r) => r.count));

  return (
    <div className="mb-4 space-y-2.5" aria-label="Path view distribution">
      {top.map((row) => {
        const pct = Math.round((row.count / maxCount) * 100);
        return (
          <div key={row.path}>
            <div className="mb-0.5 flex justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate font-mono" title={row.path}>
                {row.path}
              </span>
              <span className="shrink-0 tabular-nums text-foreground/90">{row.count.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full min-w-[2px] rounded-full bg-muted-foreground/50"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
