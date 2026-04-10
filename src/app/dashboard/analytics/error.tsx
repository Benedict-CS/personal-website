"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardAnalyticsError({
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
      title="Analytics view failed to render"
      description="Your analytics data is still safe. Retry now or return to the dashboard overview."
      homeHref="/dashboard"
      homeLabel="Dashboard overview"
    />
  );
}
