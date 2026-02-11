"use client";

import { usePathname } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { LeaveGuardLink } from "@/components/leave-guard-link";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  posts: "Posts",
  new: "New",
  edit: "Edit",
  notes: "Notes",
  content: "Content",
  home: "Home",
  contact: "Contact",
  media: "Media",
  tags: "Tags",
  about: "About & CV",
  cv: "CV",
};

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
    let label =
      SEGMENT_LABELS[seg] ??
      (i === segments.length - 1 && seg.length > 10 ? "Edit" : seg);
    if (i === segments.length - 1 && override?.label) {
      label = `Edit "${override.label}"`;
    }
    crumbs.push({ href: "/" + href, label });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1.5 text-sm text-slate-600"
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-400">/</span>}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-slate-900">{crumb.label}</span>
          ) : (
            <LeaveGuardLink
              href={crumb.href}
              className="hover:text-slate-900 hover:underline"
            >
              {crumb.label}
            </LeaveGuardLink>
          )}
        </span>
      ))}
    </nav>
  );
}
