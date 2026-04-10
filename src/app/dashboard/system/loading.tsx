import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function SystemLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading system dashboard">
      <div className="space-y-2">
        <SkeletonLine className="h-5 w-24" />
        <SkeletonLine className="h-8 w-64" />
        <SkeletonLine className="h-4 w-full max-w-2xl" />
      </div>
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-1)]">
          <SkeletonLine className="h-5 w-44" />
          <div className="mt-3 space-y-2">
            <SkeletonLine className="h-9 w-56" />
            <SkeletonLine className="h-4 w-full max-w-xl opacity-90" />
            <SkeletonLine className="h-4 w-full max-w-lg opacity-80" />
          </div>
        </div>
      ))}
    </div>
  );
}
