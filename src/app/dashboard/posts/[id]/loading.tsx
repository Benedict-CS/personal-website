export default function PostEditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-3/4 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded bg-muted" />
        <div className="h-9 w-20 rounded bg-muted" />
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
