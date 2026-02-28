export default function PostEditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-3/4 rounded bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded bg-slate-100" />
        <div className="h-9 w-20 rounded bg-slate-100" />
      </div>
      <div className="h-64 rounded-lg bg-slate-100" />
    </div>
  );
}
