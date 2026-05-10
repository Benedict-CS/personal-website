/** Human labels for `/dashboard/...` URL segments (breadcrumbs + top bar). */
export const DASHBOARD_SEGMENT_LABELS: Record<string, string> = {
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
  editor: "Editor",
  crm: "CRM",
  infra: "Infrastructure",
  ai: "AI",
  tools: "Tools",
  "ast-lab": "Markdown AST",
  system: "System health",
  hubs: "Hubs",
  "global-settings": "Global settings hub",
  "taxonomy-assets": "Content taxonomy & assets",
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
  if (parts.length < 2) return "Dashboard";
  const seg = parts[1];
  return DASHBOARD_SEGMENT_LABELS[seg] ?? titleCaseSegment(seg);
}
