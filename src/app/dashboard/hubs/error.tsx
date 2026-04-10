"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardHubsError({
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
      title="Hubs workspace hit an error"
      description="Global settings and taxonomy tools are safe to retry. Use Retry or return to the dashboard overview."
      homeHref="/dashboard/overview"
      homeLabel="Overview"
    />
  );
}
