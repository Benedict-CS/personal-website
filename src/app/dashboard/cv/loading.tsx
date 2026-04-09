export default function CvLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading CV">
      <div className="h-8 w-40 rounded-lg skeleton-shimmer" />
      <div className="h-24 rounded-xl skeleton-shimmer" />
    </div>
  );
}
