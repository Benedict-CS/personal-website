import { cn } from "@/lib/utils";

/**
 * Shared layout and typography for dashboard pages (premium light, design tokens).
 */
export function DashboardPageHeader({
  title,
  description,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function DashboardSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold tracking-tight text-foreground", className)}>{children}</h2>
  );
}

/** Elevated panel matching Card / Vercel-like surfaces (uses CSS variables). */
export function DashboardPanel({
  className,
  children,
  padding = "md",
}: {
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-4"
        : padding === "lg"
          ? "p-10"
          : "p-6";
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-[box-shadow,border-color] duration-200",
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function dashboardKbdClassName() {
  return "rounded-md border border-border bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground";
}

export function DashboardKbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <kbd className={cn(dashboardKbdClassName(), className)}>{children}</kbd>;
}

/** Large metric numbers (overview + analytics) — Vercel-like restraint */
export function dashboardMetricValueClassName() {
  return "text-2xl font-semibold tracking-tight text-foreground tabular-nums";
}

/**
 * Empty / zero-state panel aligned with dashboard cards (light, bordered).
 */
export function DashboardEmptyState({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-8 py-12 text-center shadow-sm",
        className,
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
