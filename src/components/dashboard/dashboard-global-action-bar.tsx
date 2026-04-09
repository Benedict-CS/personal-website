import { cn } from "@/lib/utils";

type DashboardGlobalActionBarProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Sticky dashboard action bar to keep primary actions predictable.
 */
export function DashboardGlobalActionBar({ className, children }: DashboardGlobalActionBarProps) {
  return (
    <div
      className={cn(
        "sticky top-[4.5rem] z-30 mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-[var(--elevation-1)] backdrop-blur-md",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}
