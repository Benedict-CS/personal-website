export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-9 w-48 rounded bg-slate-200" />
      <div className="flex gap-4">
        <div className="h-24 w-36 rounded-lg bg-slate-200" />
        <div className="h-24 w-36 rounded-lg bg-slate-200" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-28 rounded bg-slate-200" />
        <div className="h-10 w-24 rounded bg-slate-200" />
        <div className="h-10 w-24 rounded bg-slate-200" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="h-6 w-32 rounded bg-slate-200 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-5 flex-1 rounded bg-slate-100" />
              <div className="h-5 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
