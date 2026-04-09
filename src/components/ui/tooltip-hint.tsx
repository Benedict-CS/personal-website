"use client";

import { cn } from "@/lib/utils";

type TooltipHintProps = {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
};

/**
 * Lightweight tooltip primitive for icon-only controls.
 */
export function TooltipHint({ label, children, side = "top" }: TooltipHintProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[120] w-max -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-[var(--elevation-3)] opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "-top-8" : "top-[calc(100%+0.4rem)]"
        )}
      >
        {label}
      </span>
    </span>
  );
}
