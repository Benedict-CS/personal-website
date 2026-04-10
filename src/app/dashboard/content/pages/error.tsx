"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardContentPagesError({
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
      title="Custom pages manager hit an error"
      description="No content has been deleted. Retry this route or return to dashboard content."
      homeHref="/dashboard/content"
      homeLabel="Content hub"
    />
  );
}
