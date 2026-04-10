"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardSiteSettingsError({
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
      title="Site settings temporarily unavailable"
      description="No configuration has been lost. Retry this route or return to the content hub."
      homeHref="/dashboard/content"
      homeLabel="Content hub"
    />
  );
}
