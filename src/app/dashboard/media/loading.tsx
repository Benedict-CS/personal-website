export default function MediaLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading media">
      <div className="h-8 w-32 rounded-lg skeleton-shimmer" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-square rounded-xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
