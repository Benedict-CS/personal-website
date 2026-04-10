import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function CustomPagesLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading custom pages">
      <div className="space-y-2">
        <SkeletonLine className="h-5 w-20" />
        <SkeletonLine className="h-8 w-56" />
        <SkeletonLine className="h-4 w-full max-w-xl" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-1)]">
        <SkeletonLine className="h-6 w-48" />
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <SkeletonLine className="h-9 w-full" />
          <SkeletonLine className="h-9 w-full" />
          <SkeletonLine className="h-9 w-full md:w-32" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-1)]">
        <SkeletonLine className="h-6 w-40" />
        <div className="mt-3 space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="rounded-lg border border-border/70 p-3">
              <div className="grid gap-2 lg:grid-cols-4">
                <SkeletonLine className="h-9 w-full" />
                <SkeletonLine className="h-9 w-full" />
                <SkeletonLine className="h-9 w-full" />
                <SkeletonLine className="h-9 w-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <SkeletonLine className="h-8 w-24" />
                <SkeletonLine className="h-8 w-24" />
                <SkeletonLine className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
