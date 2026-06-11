export default function AboutLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 h-32 w-32 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mb-3 h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-5 w-80 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted/70" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
