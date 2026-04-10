import { cn } from "@/lib/utils";

export type DashboardEmptyIllustrationVariant =
  | "documents"
  | "folder"
  | "magnifier"
  | "chart"
  | "gallery"
  | "tags"
  | "clipboard"
  | "layers";

/** Minimal line illustrations for empty states (elite light, no raster assets). */
export function DashboardEmptyIllustration({ variant }: { variant: DashboardEmptyIllustrationVariant }) {
  const common = "mx-auto mb-6 block h-[5.5rem] w-full max-w-[11rem] text-muted-foreground/40";
  switch (variant) {
    case "documents":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="18" y="10" width="54" height="68" rx="6" stroke="currentColor" strokeWidth="2" />
          <rect x="42" y="6" width="54" height="68" rx="6" stroke="currentColor" strokeWidth="2" />
          <path d="M30 28h30M30 40h22M30 52h26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "folder":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M20 32h28l8-10h44v46H20V32z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M20 38h80" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "magnifier":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="48" cy="40" r="22" stroke="currentColor" strokeWidth="2" />
          <path d="M64 56l22 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M20 68V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 68h84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="32" y="44" width="14" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="54" y="32" width="14" height="36" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="76" y="52" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "gallery":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="16" y="14" width="88" height="60" rx="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M28 58l18-22 14 16 12-14 20 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="40" cy="34" r="6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "tags":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M24 22h38l14 14v28H24V22z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="40" cy="36" r="4" fill="currentColor" />
          <path
            d="M58 48h38l14 14v20H58V48z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.65"
          />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="34" y="16" width="52" height="64" rx="6" stroke="currentColor" strokeWidth="2" />
          <path d="M46 16v-6h28v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 32h36M42 44h36M42 56h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "layers":
      return (
        <svg className={common} viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="28" y="20" width="64" height="44" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.45" />
          <rect x="22" y="14" width="64" height="44" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          <rect x="16" y="8" width="64" height="44" rx="6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}

/**
 * Shared layout and typography for dashboard pages (premium light, design tokens).
 */
export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small label above the title (section context, product area, etc.). */
  eyebrow?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div> : null}
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
    <h2 className={cn("text-lg font-semibold tracking-[-0.02em] text-foreground", className)}>{children}</h2>
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
        "rounded-xl border border-border bg-card text-card-foreground shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200",
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Standard dashboard card surface used across overview/list pages. */
export function dashboardCardClassName() {
  return "border-border shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200";
}

/** Hoverable dashboard card surface for link grids and metric tiles. */
export function dashboardInteractiveCardClassName() {
  return `${dashboardCardClassName()} hover:shadow-[var(--elevation-2)] hover:border-muted-foreground/25`;
}

/** Primary action button baseline for dashboard header/toolbars. */
export function dashboardPrimaryActionButtonClassName() {
  return "h-9 rounded-lg px-3 text-sm font-medium shadow-[var(--elevation-1)] transition-[transform,opacity] duration-150 active:scale-[0.98] motion-reduce:active:scale-100";
}

/** Secondary action button baseline for dashboard header/toolbars. */
export function dashboardSecondaryActionButtonClassName() {
  return "h-9 rounded-md px-3 text-sm font-medium transition-[transform,opacity] duration-150 active:scale-[0.98] motion-reduce:active:scale-100";
}

/** Compact outline action variant for dense filter/tool rows. */
export function dashboardSubtleActionButtonClassName() {
  return "h-8 rounded-md px-2.5 text-xs font-medium transition-[transform,opacity] duration-150 active:scale-[0.98] motion-reduce:active:scale-100";
}

/** Shared uppercase section eyebrow style for dashboard sub-headings. */
export function dashboardSectionEyebrowClassName() {
  return "text-sm font-semibold uppercase tracking-wide text-muted-foreground";
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
  return "text-2xl font-semibold tracking-[-0.03em] text-foreground tabular-nums";
}

/**
 * Empty / zero-state panel aligned with dashboard cards (light, bordered).
 */
export function DashboardEmptyState({
  title,
  description,
  children,
  className,
  illustration,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  illustration?: DashboardEmptyIllustrationVariant;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-8 py-12 text-center shadow-[var(--elevation-1)]",
        className,
      )}
    >
      {illustration ? <DashboardEmptyIllustration variant={illustration} /> : null}
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
