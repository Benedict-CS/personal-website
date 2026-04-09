"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilePlus2, FolderTree, Settings, Wrench } from "lucide-react";

export function DashboardGlobalHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="sticky top-16 z-20 mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-[var(--elevation-1)] backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Global actions</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant={isActive("/dashboard/posts/new") ? "default" : "outline"} className="gap-2">
            <Link href="/dashboard/posts/new">
              <FilePlus2 className="h-4 w-4" />
              New Post
            </Link>
          </Button>
          <Button asChild size="sm" variant={isActive("/dashboard/hubs/taxonomy-assets") ? "default" : "outline"} className="gap-2">
            <Link href="/dashboard/hubs/taxonomy-assets">
              <FolderTree className="h-4 w-4" />
              Taxonomy & Assets
            </Link>
          </Button>
          <Button asChild size="sm" variant={isActive("/dashboard/hubs/global-settings") ? "default" : "outline"} className="gap-2">
            <Link href="/dashboard/hubs/global-settings">
              <Settings className="h-4 w-4" />
              Global Settings
            </Link>
          </Button>
          <Button asChild size="sm" variant={isActive("/dashboard/tools/ast-lab") ? "default" : "outline"} className="gap-2">
            <Link href="/dashboard/tools/ast-lab">
              <Wrench className="h-4 w-4" />
              AST Lab
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
