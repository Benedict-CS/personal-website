export default function SetupLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-64 rounded bg-slate-200" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
