import { SkeletonCardBlock, SkeletonToolbar } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function PostsOperationsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading content operations">
      <SkeletonToolbar />
      <SkeletonCardBlock tall />
    </div>
  );
}
