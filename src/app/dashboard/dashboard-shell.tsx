"use client";

import { useState, useEffect } from "react";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import { LeaveGuardProvider } from "@/contexts/leave-guard-context";
import { DashboardNav } from "./dashboard-nav";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import { DashboardCommandPalette } from "./dashboard-command-palette";
import { SessionExpiryBanner } from "@/components/session-expiry-banner";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dashboard-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch {
      // ignore
    }
  }, [mounted]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const mainMargin = collapsed ? "ml-16" : "ml-64";

  return (
    <LeaveGuardProvider>
    <BreadcrumbProvider>
    <>
    <DashboardCommandPalette />
    <div className="flex flex-1 min-h-0">
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-slate-200 bg-slate-50 z-10 transition-[width] duration-200 ease-out ${sidebarWidth} flex flex-col overflow-hidden`}
      >
        <div className={`flex flex-col flex-1 min-h-0 ${collapsed ? "p-2" : "p-6"} overflow-y-auto`}>
          <div className={`flex items-center shrink-0 ${collapsed ? "justify-center" : "justify-between"} mb-4`}>
            {!collapsed && <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Menu</span>}
            <kbd className={collapsed ? "hidden" : "mr-2 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"} title="Open command palette">
              ⌘K
            </kbd>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="shrink-0 h-8 w-8"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DashboardNav collapsed={collapsed} />
        </div>
      </aside>
      <main
        className={`${mainMargin} flex-1 min-h-0 bg-slate-50 transition-[margin] duration-200 ease-out`}
        style={{ ["--dashboard-sidebar-width" as string]: collapsed ? "4rem" : "16rem" }}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <SessionExpiryBanner />
          <div className="p-4 sm:p-6 lg:p-8 dashboard-content-in min-w-0 flex-1">
            <DashboardBreadcrumbs />
            {children}
          </div>
        </div>
      </main>
    </div>
    </>
    </BreadcrumbProvider>
    </LeaveGuardProvider>
  );
}
