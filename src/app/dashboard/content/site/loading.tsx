export default function SiteSettingsLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading site settings">
      <div className="h-8 w-56 rounded-lg skeleton-shimmer" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
