"use client";

import { usePathname } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { LeaveGuardLink } from "@/components/leave-guard-link";
import { DASHBOARD_SEGMENT_LABELS } from "@/lib/dashboard-segment-labels";
import { ChevronRight } from "lucide-react";

function labelForSegment(seg: string, index: number, segments: string[], overrideLabel: string | null): string {
  const total = segments.length;
  if (index === total - 1 && overrideLabel) {
    return `Edit "${overrideLabel}"`;
  }
  if (DASHBOARD_SEGMENT_LABELS[seg]) return DASHBOARD_SEGMENT_LABELS[seg];
  if (index === total - 1 && seg.length > 12) {
    return "Edit";
  }
  return seg;
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const { override } = useBreadcrumb();
  if (!pathname?.startsWith("/dashboard")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  // /dashboard/<section> — sidebar + page H1 already show the section; skip redundant "Dashboard › Analytics".
  if (segments.length === 2 && segments[0] === "dashboard") return null;

  const crumbs: { href: string; label: string }[] = [];
  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    href += (href ? "/" : "") + seg;
    const label = labelForSegment(seg, i, segments, override?.label ?? null);
    crumbs.push({ href: "/" + href, label });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex min-w-0 items-center gap-1">
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          )}
          {i === crumbs.length - 1 ? (
            <span className="truncate font-medium text-foreground">{crumb.label}</span>
          ) : (
            <LeaveGuardLink
              href={crumb.href}
              className="truncate transition-colors duration-150 hover:text-foreground hover:underline"
            >
              {crumb.label}
            </LeaveGuardLink>
          )}
        </span>
      ))}
    </nav>
  );
}
