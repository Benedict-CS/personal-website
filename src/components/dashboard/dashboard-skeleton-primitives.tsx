/**
 * Shared loading skeleton primitives — directional shimmer (light-mode design system).
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg motion-safe:skeleton-shimmer motion-reduce:bg-muted/55 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonToolbar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonLine className="h-9 w-24" />
        <SkeletonLine className="h-9 w-28" />
      </div>
    </div>
  );
}

export function SkeletonCardBlock({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)] ${tall ? "min-h-[200px]" : ""}`}
      aria-hidden
    >
      <SkeletonLine className="mb-4 h-5 w-32" />
      <div className="space-y-2.5">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-[88%]" />
        <SkeletonLine className="h-4 w-[72%]" />
      </div>
    </div>
  );
}

export function DashboardHubPageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading">
      <SkeletonToolbar />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCardBlock />
        <SkeletonCardBlock />
        <SkeletonCardBlock tall />
      </div>
    </div>
  );
}
