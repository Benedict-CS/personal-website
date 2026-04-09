"use client";

import { usePathname } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { LeaveGuardLink } from "@/components/leave-guard-link";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  overview: "Site overview",
  posts: "Posts",
  operations: "Find & replace",
  new: "New",
  edit: "Edit",
  notes: "Notes",
  content: "Content",
  home: "Home page",
  contact: "Contact",
  media: "Media",
  tags: "Tags",
  about: "About & CV",
  cv: "CV",
  site: "Site settings",
  pages: "Custom pages",
  setup: "Setup",
  audit: "Audit",
  sites: "Sites",
  billing: "Billing",
  editor: "Editor",
  experiments: "Experiments",
  commerce: "Commerce",
  crm: "CRM",
  infra: "Infrastructure",
  ai: "AI",
  showroom: "Showroom",
  tools: "Tools",
  "ast-lab": "Markdown AST",
};

/** Slugs and database IDs: avoid raw opaque strings in the breadcrumb trail. */
function looksLikeOpaqueId(seg: string): boolean {
  return seg.length >= 12 && /^[a-z0-9._-]+$/i.test(seg);
}

function labelForSegment(seg: string, index: number, segments: string[], overrideLabel: string | null): string {
  const total = segments.length;
  const prev = index > 0 ? segments[index - 1] : "";
  if (index === total - 1 && overrideLabel) {
    return `Edit "${overrideLabel}"`;
  }
  if (prev === "sites" && index === 2 && looksLikeOpaqueId(seg)) {
    return "Site";
  }
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
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
