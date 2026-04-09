export default function SetupLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading setup">
      <div className="h-10 w-64 rounded-lg skeleton-shimmer" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
