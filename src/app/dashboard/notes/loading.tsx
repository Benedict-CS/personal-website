export default function NotesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-36 rounded bg-muted" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
