import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonLine } from "@/components/dashboard/dashboard-skeleton-primitives";

export default function PostsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading posts">
      <div className="flex justify-between gap-4">
        <SkeletonLine className="h-9 w-40" />
        <div className="flex gap-2">
          <SkeletonLine className="h-9 w-16" />
          <SkeletonLine className="h-9 w-28" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--elevation-1)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <SkeletonLine className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <SkeletonLine className="h-5 w-48" />
                </TableCell>
                <TableCell>
                  <SkeletonLine className="h-5 w-20 opacity-90" />
                </TableCell>
                <TableCell>
                  <SkeletonLine className="h-5 w-24 opacity-90" />
                </TableCell>
                <TableCell>
                  <SkeletonLine className="h-5 w-24 opacity-90" />
                </TableCell>
                <TableCell className="text-right">
                  <SkeletonLine className="ml-auto h-8 w-16 opacity-80" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
