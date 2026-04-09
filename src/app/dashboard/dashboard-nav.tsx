"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LeaveGuardLink } from "@/components/leave-guard-link";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  LineChart,
  LayoutDashboard,
} from "lucide-react";

type NavChildItem = {
  href: string;
  label: string;
};

type NavItem = {
  id: string;
  href: string;
  label: "Analytics" | "Manage" | "Insights";
  icon: typeof Settings2 | typeof LineChart | typeof LayoutDashboard;
  exact: boolean;
  children?: readonly NavChildItem[];
};

const manageSubItems = [
  { href: "/dashboard/posts", label: "Posts" },
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/content/site", label: "Site settings" },
  { href: "/dashboard/content/pages", label: "Custom pages" },
] as const;

const insightsSubItems = [
  { href: "/dashboard/overview", label: "Site overview" },
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/tags", label: "Tags" },
  { href: "/dashboard/tools/ast-lab", label: "Markdown AST lab" },
  { href: "/dashboard/audit", label: "Audit" },
] as const;

const navItems: readonly NavItem[] = [
  { id: "analytics", href: "/dashboard/analytics", label: "Analytics", icon: LineChart, exact: true },
  { id: "insights", href: "/dashboard/notes", label: "Insights", icon: LayoutDashboard, exact: false, children: insightsSubItems },
  { id: "manage", href: "/dashboard/content/site", label: "Manage", icon: Settings2, exact: false, children: manageSubItems },
] as const;

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/posts", label: "Posts" },
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/content/site", label: "Site settings" },
  { href: "/dashboard/content/pages", label: "Custom pages" },
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/tags", label: "Tags" },
  { href: "/dashboard/tools/ast-lab", label: "Markdown AST lab" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/dashboard/overview", label: "Site overview" },
] as const;

interface DashboardNavProps {
  collapsed?: boolean;
}

function stripHash(href: string): string {
  return href.split("#")[0] || href;
}

export function DashboardNav({ collapsed = false }: DashboardNavProps) {
  const pathname = usePathname();
  const isManageActive = manageSubItems.some((sub) => {
    const target = stripHash(sub.href);
    return pathname === target || pathname.startsWith(`${target}/`);
  });
  const isInsightsActive = insightsSubItems.some((sub) => {
    const target = stripHash(sub.href);
    return pathname === target || pathname.startsWith(`${target}/`);
  });
  const [manageOpen, setManageOpen] = useState(isManageActive);
  const [insightsOpen, setInsightsOpen] = useState(isInsightsActive);
  const [collapsedOpenGroup, setCollapsedOpenGroup] = useState<string | null>(null);
  const collapsedGroupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!collapsedOpenGroup) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = collapsedGroupRef.current;
      if (el && !el.contains(e.target as Node)) {
        setCollapsedOpenGroup(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapsedOpenGroup(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [collapsedOpenGroup]);

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const { id, href, label, icon: Icon, exact, children } = item;
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + "/");

        if (children && !collapsed) {
          const isGroupActive = children.some((sub) => {
            const target = stripHash(sub.href);
            return pathname === target || pathname.startsWith(`${target}/`);
          });
          const open = id === "manage" ? (manageOpen || isManageActive) : (insightsOpen || isInsightsActive);
          return (
            <div key={href}>
              <button
                type="button"
                onClick={() => {
                  if (id === "manage") {
                    setManageOpen((o) => !o);
                    return;
                  }
                  setInsightsOpen((o) => !o);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  isGroupActive
                    ? "bg-accent text-accent-foreground font-medium ring-1 ring-border"
                    : "text-foreground hover:bg-accent/70 hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{label}</span>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {open && (
                <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                  {children.map((sub) => {
                    const target = stripHash(sub.href);
                    const subActive = pathname === target || pathname.startsWith(`${target}/`);
                    return (
                      <LeaveGuardLink
                        key={sub.href}
                        href={sub.href}
                        aria-current={subActive ? "page" : undefined}
                        className={`rounded-md py-1.5 pl-2 text-sm transition-[background-color,color] duration-150 ${
                          subActive
                            ? "font-medium text-foreground bg-accent/50"
                            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </LeaveGuardLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (children && collapsed) {
          const isGroupActive = children.some((sub) => {
            const target = stripHash(sub.href);
            return pathname === target || pathname.startsWith(`${target}/`);
          });
          return (
            <div key={href} ref={collapsedOpenGroup === id ? collapsedGroupRef : undefined} className="relative">
              <button
                type="button"
                title={label}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={collapsedOpenGroup === id}
                onClick={() => setCollapsedOpenGroup((current) => (current === id ? null : id))}
                className={`flex w-full justify-center rounded-lg p-2 transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  isGroupActive || collapsedOpenGroup === id
                    ? "bg-accent text-accent-foreground ring-1 ring-border"
                    : "text-foreground hover:bg-accent/70"
                }`}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 stroke-[1.75]" aria-hidden />
              </button>
              {collapsedOpenGroup === id && (
                <div className="absolute left-full top-0 z-30 ml-2 min-w-[11rem] rounded-lg border border-border bg-card p-1 shadow-lg">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  {children.map((sub) => {
                    const target = stripHash(sub.href);
                    const subActive = pathname === target || pathname.startsWith(`${target}/`);
                    return (
                      <LeaveGuardLink
                        key={sub.href}
                        href={sub.href}
                        aria-current={subActive ? "page" : undefined}
                        onClick={() => setCollapsedOpenGroup(null)}
                        className={`block rounded-md px-2 py-1.5 text-sm transition-[background-color,color] duration-150 ${
                          subActive
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-foreground hover:bg-accent/60"
                        }`}
                      >
                        {sub.label}
                      </LeaveGuardLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <LeaveGuardLink
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={`flex items-center rounded-lg transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              collapsed ? "justify-center p-2 hover:bg-accent/70" : "gap-2 px-3 py-2"
            } ${
              isActive
                ? "bg-accent text-accent-foreground font-medium ring-1 ring-border"
                : "text-foreground hover:bg-accent/70 hover:text-accent-foreground"
            }`}
          >
            <Icon className={`shrink-0 ${collapsed ? "h-[1.125rem] w-[1.125rem] stroke-[1.75]" : "h-4 w-4"}`} aria-hidden />
            {!collapsed && <span>{label}</span>}
          </LeaveGuardLink>
        );
      })}
    </nav>
  );
}
