export default function AuditLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading audit log">
      <div className="h-9 w-48 rounded-lg skeleton-shimmer" />
      <div className="h-4 w-96 max-w-full rounded-lg skeleton-shimmer" />
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <div className="mb-4 h-6 w-40 rounded-lg skeleton-shimmer" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 border-b border-border/70 pb-2">
              <div className="h-4 w-24 rounded-lg skeleton-shimmer" />
              <div className="h-4 w-32 rounded-lg skeleton-shimmer" />
              <div className="h-4 flex-1 rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
