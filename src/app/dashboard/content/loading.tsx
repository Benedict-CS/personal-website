export default function ContentLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading content">
      <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-xl skeleton-shimmer" />
        <div className="h-24 rounded-xl skeleton-shimmer" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <div className="h-6 w-32 rounded-lg skeleton-shimmer mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}
