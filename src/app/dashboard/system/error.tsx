"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardSystemError({
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
      title="System tools encountered an error"
      description="Maintenance tools are temporarily unavailable in this view. Retry or navigate back safely."
      homeHref="/dashboard/system"
      homeLabel="System health"
    />
  );
}
