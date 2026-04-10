"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardContentHubError({
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
      title="Content hub failed to load"
      description="Your content is safe. Retry this route or return to dashboard overview."
      homeHref="/dashboard"
      homeLabel="Dashboard overview"
    />
  );
}
