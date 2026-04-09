/**
 * Shared loading skeleton primitives using dashboard CSS variables (light-mode design system).
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-muted animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonToolbar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-72 max-w-full opacity-80" />
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
      className={`rounded-xl border border-border bg-card p-6 shadow-sm ${tall ? "min-h-[200px]" : ""}`}
      aria-hidden
    >
      <SkeletonLine className="mb-4 h-5 w-32" />
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-full opacity-90" />
        <SkeletonLine className="h-4 w-[88%] opacity-80" />
        <SkeletonLine className="h-4 w-[72%] opacity-70" />
      </div>
    </div>
  );
}

/** Compact placeholder for hub pages (overview, sites list) while server data resolves. */
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
