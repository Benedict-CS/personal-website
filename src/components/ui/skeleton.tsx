import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder block with directional shimmer sweep. Falls back to static for reduced motion.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg motion-safe:skeleton-shimmer motion-reduce:bg-[var(--muted)]/55",
        className
      )}
      {...props}
    />
  );
}
