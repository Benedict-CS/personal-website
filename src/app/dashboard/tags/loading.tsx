import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function TagsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading tags">
      <SkeletonLine className="h-8 w-48 max-w-full" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonLine key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <SkeletonLine className="mb-4 h-6 w-56" />
        <SkeletonLine className="h-4 w-full max-w-md" />
      </div>
    </div>
  );
}
