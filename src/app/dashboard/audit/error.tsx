"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardAuditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteError
      error={error}
      reset={reset}
      title="Audit log view failed to render"
      description="No records were modified. Retry this route or return to dashboard operations."
      homeHref="/dashboard"
      homeLabel="Dashboard overview"
    />
  );
}
