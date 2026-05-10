import type { ReactNode } from "react";
import { CmsSyncProvider } from "@/contexts/cms-sync-context";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import { LeaveGuardProvider } from "@/contexts/leave-guard-context";

/**
 * Editor route group layout.
 *
 * The immersive editor mounts dashboard surfaces (e.g. `/editor/blog` reuses
 * `<DashboardPostsPage>` which calls `useCmsSync`). Those hooks were previously
 * only provided by `<DashboardShell>` under `/dashboard/*`, so navigating to
 * `/editor/blog` threw `useCmsSync must be used within a CmsSyncProvider.` and
 * tripped the editor error boundary on every load.
 *
 * Mirror the dashboard's context stack so any dashboard component embedded in
 * the editor keeps working without each page having to wrap itself.
 */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <LeaveGuardProvider>
      <BreadcrumbProvider>
        <CmsSyncProvider>{children}</CmsSyncProvider>
      </BreadcrumbProvider>
    </LeaveGuardProvider>
  );
}
