export default function ContentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="h-6 w-32 rounded bg-muted mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
