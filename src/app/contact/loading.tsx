export default function ContactLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 space-y-3">
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="mb-10 flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ))}
          <div className="h-11 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
