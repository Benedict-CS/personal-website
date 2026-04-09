import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function AstLabLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading AST lab">
      <SkeletonLine className="h-10 w-full max-w-xl rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-h-[320px] rounded-2xl border border-border bg-card p-4">
          <SkeletonLine className="mb-4 h-4 w-24" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLine key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
        <div className="min-h-[320px] rounded-2xl border border-border bg-card p-4">
          <SkeletonLine className="mb-4 h-4 w-32" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SkeletonLine key={i} className="h-3 w-[90%]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
