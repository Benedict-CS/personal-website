export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading dashboard">
      {/* Header skeleton: title, description, toolbar + buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-80 max-w-full rounded bg-muted/80 animate-pulse" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Risk strip skeleton */}
      <div
        className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm"
        aria-hidden
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-6 w-44 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted/70 animate-pulse" />
          </div>
          <div className="h-8 w-36 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Three metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card py-6 shadow-sm"
          >
            <div className="px-6 pb-2">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-2 px-6">
              <div className="h-8 w-12 rounded-lg bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted/70 animate-pulse" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-14 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-muted/60 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid: 2 cols + 1 col */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 h-5 w-28 rounded bg-muted animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-4 flex-1 rounded bg-muted/80 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 h-5 w-36 rounded bg-muted animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 rounded bg-muted/70 animate-pulse" style={{ width: `${60 + i * 8}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted/70 animate-pulse" />
              <div className="h-4 w-[80%] rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="flex gap-3">
              <div className="h-16 flex-1 rounded-lg bg-muted/80 animate-pulse" />
              <div className="h-16 flex-1 rounded-lg bg-muted/80 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
