import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder block for async layouts. Respects reduced motion (no pulse when preferred).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[var(--muted)]/55 motion-safe:animate-pulse motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}
