"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LeaveGuardLink } from "@/components/leave-guard-link";
import {
  FileText,
  Image as ImageIcon,
  Tags,
  StickyNote,
  Layout,
  BarChart3,
  Home,
  ChevronDown,
  ChevronRight,
  ScrollText,
  Mail,
  UserCircle2,
  Settings,
  Layers,
} from "lucide-react";

const morePagesSubItems = [
  { href: "/dashboard/content/pages", label: "Custom pages" },
] as const;

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  exact: boolean;
  hasChildren?: boolean;
}> = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/posts", label: "Posts", icon: FileText, exact: false },
  { href: "/editor/home", label: "Home page", icon: Layout, exact: false },
  { href: "/editor/about", label: "About page", icon: UserCircle2, exact: false },
  { href: "/editor/contact", label: "Contact page", icon: Mail, exact: false },
  { href: "/dashboard/content/site", label: "Site settings", icon: Settings, exact: false },
  { href: "/dashboard/content/pages", label: "More pages", icon: Layers, exact: false, hasChildren: true },
  { href: "/dashboard/notes", label: "Notes", icon: StickyNote, exact: false },
  { href: "/dashboard/media", label: "Media", icon: ImageIcon, exact: false },
  { href: "/dashboard/tags", label: "Tags", icon: Tags, exact: false },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText, exact: false },
];

interface DashboardNavProps {
  collapsed?: boolean;
}

export function DashboardNav({ collapsed = false }: DashboardNavProps) {
  const pathname = usePathname();
  const isMorePagesActive = pathname === "/dashboard/content/pages" || pathname.startsWith("/dashboard/content/pages/");
  const [morePagesOpen, setMorePagesOpen] = useState(isMorePagesActive);

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const { href, label, icon: Icon, exact, hasChildren } = item;
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + "/");

        if (hasChildren && !collapsed) {
          const open = morePagesOpen || isMorePagesActive;
          return (
            <div key={href}>
              <button
                type="button"
                onClick={() => setMorePagesOpen((o) => !o)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-slate-200/90 text-slate-900 font-medium ring-1 ring-slate-300/50"
                    : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {open && (
                <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
                  {morePagesSubItems.map((sub) => {
                    const subActive = pathname === sub.href;
                    return (
                      <LeaveGuardLink
                        key={sub.href}
                        href={sub.href}
                        className={`rounded py-1.5 pl-2 text-sm transition-colors ${
                          subActive
                            ? "font-medium text-slate-900"
                            : "text-slate-600 hover:text-slate-900"
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

        if (hasChildren && collapsed) {
          return (
            <LeaveGuardLink
              key={href}
              href={href}
              title={label}
              className={`flex justify-center rounded-md p-2 transition-colors ${
                isActive
                  ? "bg-slate-200/90 text-slate-900 ring-1 ring-slate-300/50"
                  : "text-slate-700 hover:bg-slate-200/60"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </LeaveGuardLink>
          );
        }

        return (
          <LeaveGuardLink
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center rounded-md transition-colors ${
              collapsed ? "justify-center p-2 hover:bg-slate-200/80" : "gap-2 px-3 py-2"
            } ${
              isActive
                ? "bg-slate-200/90 text-slate-900 font-medium ring-1 ring-slate-300/50"
                : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
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
