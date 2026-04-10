"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardSiteDetailError({
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
      title="This site section hit an error"
      description="Retry this screen or open another site area from the list. No automatic data loss occurred."
      homeHref="/dashboard/sites"
      homeLabel="All sites"
    />
  );
}
