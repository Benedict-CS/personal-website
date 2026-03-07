export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 border-b border-slate-100 pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
