export default function AboutContentLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="h-24 rounded-lg bg-slate-100" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
