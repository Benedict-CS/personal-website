"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import { LeaveGuardProvider } from "@/contexts/leave-guard-context";
import { DashboardNav } from "./dashboard-nav";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import { DashboardCommandPalette } from "./dashboard-command-palette";
import { DashboardKeyboardHelp } from "./dashboard-keyboard-help";
import { DashboardConnectivityWatcher } from "@/components/dashboard/dashboard-connectivity-watcher";
import { SessionExpiryBanner } from "@/components/session-expiry-banner";
import { SessionGuard } from "@/components/session-guard";
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dashboard-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

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
  return (
    <LeaveGuardProvider>
    <BreadcrumbProvider>
    <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:outline-none focus:shadow-md"
    >
      Skip to main content
    </a>
    <SessionGuard />
    <DashboardConnectivityWatcher />
    <DashboardCommandPalette />
    <DashboardKeyboardHelp />
    {/* Mobile menu button: visible only on small screens */}
    <div className="fixed left-4 top-20 z-30 md:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        aria-controls="dashboard-mobile-nav"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
    {/* Mobile drawer overlay */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-20 bg-foreground/12 backdrop-blur-[2px] md:hidden"
        aria-hidden
        onClick={() => setMobileOpen(false)}
      />
    )}
    {/* Mobile drawer */}
    <aside
      id="dashboard-mobile-nav"
      className={`fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card shadow-lg transition-transform duration-200 ease-out md:hidden ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col p-4 overflow-y-auto">
        <DashboardNav collapsed={false} />
      </div>
    </aside>
    <div className="flex flex-1 min-h-0">
      <aside
        className={`hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-border bg-card z-10 transition-[width] duration-200 ease-out ${sidebarWidth} flex-col overflow-visible shadow-sm`}
      >
        <div className={`flex flex-col flex-1 min-h-0 ${collapsed ? "p-2 overflow-visible" : "p-6 overflow-y-auto"}`}>
          <div className={`flex items-center shrink-0 ${collapsed ? "justify-center" : "justify-between"} mb-4`}>
            {!collapsed && <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Menu</span>}
            <kbd
              className={
                collapsed
                  ? "hidden"
                  : "mr-2 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              }
              title="Command palette (Ctrl+K or ⌘K)"
            >
              ⌘K
            </kbd>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
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
        id="main-content"
        tabIndex={-1}
        className={`flex-1 min-h-0 bg-background pl-14 md:pl-0 ${collapsed ? "md:ml-16" : "md:ml-64"} transition-[margin] duration-200 ease-out`}
        style={{ ["--dashboard-sidebar-width" as string]: collapsed ? "4rem" : "16rem" }}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <SessionExpiryBanner />
          <div className="p-4 sm:p-6 lg:p-8 dashboard-content-in min-w-0 flex-1">
            <DashboardBreadcrumbs />
            <motion.div
              key={pathname ?? ""}
              initial={reduceMotion ? false : { opacity: 0.88, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }
              }
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
    </>
    </BreadcrumbProvider>
    </LeaveGuardProvider>
  );
}
