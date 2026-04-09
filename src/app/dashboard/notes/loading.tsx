export default function NotesLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading notes">
      <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
