import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/** Aligns with `Navbar` / `Footer`: single source for horizontal gutters and max width. */
export const publicSiteContainerClassName =
  "container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

/** Blog post + TOC: full-width grid under the same horizontal padding as the rest of the site. */
export const publicWidePageContainerClassName =
  "container mx-auto max-w-[120rem] px-4 sm:px-6 lg:px-8";

const shellPadding = {
  default: "py-8 sm:py-10 lg:py-12",
  compact: "py-8 sm:py-10",
  spacious: "py-12 md:py-16 lg:py-20",
} as const;

const shellMaxWidth = {
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
  wide: "max-w-[120rem]",
} as const;

export type PublicPageShellPad = keyof typeof shellPadding;
export type PublicPageShellMaxWidth = keyof typeof shellMaxWidth;

/**
 * Standard page width + vertical rhythm for marketing and content routes.
 */
export function PublicPageShell({
  children,
  className,
  pad = "default",
  maxWidth = "6xl",
}: {
  children: React.ReactNode;
  className?: string;
  pad?: PublicPageShellPad;
  maxWidth?: PublicPageShellMaxWidth;
}) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8",
        shellMaxWidth[maxWidth],
        shellPadding[pad],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Vertical spacing for home sections and custom markdown blocks. */
export const publicSectionPadding = {
  hero: "py-20 md:py-28 lg:py-32",
  heroMinimal: "py-12 md:py-16",
  section: "py-16",
  tight: "py-10 md:py-12",
} as const;

export type PublicSectionDensity = keyof typeof publicSectionPadding;

export function PublicSection({
  id,
  children,
  className,
  density = "section",
  ...rest
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  density?: PublicSectionDensity;
} & Omit<ComponentPropsWithoutRef<"section">, "id" | "className" | "children">) {
  return (
    <section
      id={id}
      className={cn(publicSiteContainerClassName, publicSectionPadding[density], className)}
      {...rest}
    >
      {children}
    </section>
  );
}

/**
 * Page title block: one H1 per page, optional lead line. Use with `PublicBreadcrumbs` above when needed.
 */
export function PublicPageHeader({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <h1
          className={cn(
            "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn("max-w-2xl text-muted-foreground leading-relaxed", descriptionClassName)}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/** Empty state aligned with dashboard empty panels (public routes). */
export function PublicEmptyState({
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
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

/** Full-viewport gradient used on contact and similar landing-style pages (light-only). */
export const publicMarketingBackgroundClassName =
  "min-h-screen bg-gradient-to-br from-muted via-background to-muted";
