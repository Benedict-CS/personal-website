export default function TagsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
