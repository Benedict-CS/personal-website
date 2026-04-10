"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardSitesError({
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
      title="Sites workspace hit an error"
      description="Your SaaS site data was not modified by this failure. Retry or return to the sites list."
      homeHref="/dashboard/sites"
      homeLabel="Sites"
    />
  );
}
