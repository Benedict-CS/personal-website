"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Image as ImageIcon, Tags, User, StickyNote } from "lucide-react";

const navItems = [
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/notes", label: "Notes", icon: StickyNote },
  { href: "/dashboard/about", label: "About & CV", icon: User },
  { href: "/dashboard/media", label: "Media", icon: ImageIcon },
  { href: "/dashboard/tags", label: "Tags", icon: Tags },
] as const;

interface DashboardNavProps {
  collapsed?: boolean;
}

export function DashboardNav({ collapsed = false }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center transition-colors ${
              collapsed ? "justify-center p-2 rounded-md hover:bg-slate-200/80" : "gap-2"
            } ${
              isActive
                ? "text-slate-900 font-medium"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
