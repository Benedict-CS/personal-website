export default function NewPostLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading new post form">
      <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
      <div className="h-12 rounded-lg skeleton-shimmer" />
      <div className="h-64 rounded-xl skeleton-shimmer" />
    </div>
  );
}
