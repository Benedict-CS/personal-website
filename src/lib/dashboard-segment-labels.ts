/** Human labels for `/dashboard/...` URL segments (breadcrumbs + top bar). */
export const DASHBOARD_SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  overview: "Analytics",
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
  editor: "Editor",
  crm: "CRM",
  infra: "Infrastructure",
  ai: "AI",
  tools: "Tools",
  system: "Analytics",
};

function titleCaseSegment(seg: string): string {
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Short label after site name in the global navbar (e.g. ` · Analytics`). */
export function dashboardNavbarSectionLabel(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return "Dashboard";
  if (parts.length < 2) return "Analytics";
  const seg = parts[1];
  return DASHBOARD_SEGMENT_LABELS[seg] ?? titleCaseSegment(seg);
}
