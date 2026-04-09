export default function PostEditLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading post editor">
      <div className="h-10 w-3/4 rounded-lg skeleton-shimmer" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-lg skeleton-shimmer" />
        <div className="h-9 w-20 rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-64 rounded-xl skeleton-shimmer" />
    </div>
  );
}
