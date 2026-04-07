"use client";

import { useState } from "react";
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
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/content/site", label: "Site settings" },
  { href: "/dashboard/content/pages", label: "Custom pages" },
] as const;

const insightsSubItems = [
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/tags", label: "Tags" },
  { href: "/dashboard/audit", label: "Audit" },
] as const;

const navItems: readonly NavItem[] = [
  { id: "analytics", href: "/dashboard/analytics", label: "Analytics", icon: LineChart, exact: true },
  { id: "insights", href: "/dashboard/notes", label: "Insights", icon: LayoutDashboard, exact: false, children: insightsSubItems },
  { id: "manage", href: "/dashboard/content/site", label: "Manage", icon: Settings2, exact: false, children: manageSubItems },
] as const;

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/content/site", label: "Site settings" },
  { href: "/dashboard/content/pages", label: "Custom pages" },
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/tags", label: "Tags" },
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
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-[background-color,color] duration-200 ${
                  isGroupActive
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium ring-1 ring-[var(--border)]"
                    : "text-[var(--foreground)] hover:bg-[var(--accent)]/70 hover:text-[var(--accent-foreground)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {open && (
                <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--border)] pl-3">
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
                            ? "font-medium text-[var(--foreground)] bg-[var(--accent)]/50"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]/40 hover:text-[var(--foreground)]"
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
            <div key={href} className="relative">
              <button
                type="button"
                title={label}
                aria-label={label}
                onClick={() => setCollapsedOpenGroup((current) => (current === id ? null : id))}
                className={`flex w-full justify-center rounded-lg p-2 transition-[background-color,color] duration-200 ${
                  isGroupActive || collapsedOpenGroup === id
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] ring-1 ring-[var(--border)]"
                    : "text-[var(--foreground)] hover:bg-[var(--accent)]/70"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </button>
              {collapsedOpenGroup === id && (
                <div className="absolute left-full top-0 z-30 ml-2 min-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-lg)]">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
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
                            ? "bg-[var(--accent)] font-medium text-[var(--accent-foreground)]"
                            : "text-[var(--foreground)] hover:bg-[var(--accent)]/60"
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
            className={`flex items-center rounded-lg transition-[background-color,color] duration-200 ${
              collapsed ? "justify-center p-2 hover:bg-[var(--accent)]/70" : "gap-2 px-3 py-2"
            } ${
              isActive
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium ring-1 ring-[var(--border)]"
                : "text-[var(--foreground)] hover:bg-[var(--accent)]/70 hover:text-[var(--accent-foreground)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </LeaveGuardLink>
        );
      })}
    </nav>
  );
}
