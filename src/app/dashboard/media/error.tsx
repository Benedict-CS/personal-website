"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardMediaError({
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
      title="Media library failed to load"
      description="Your uploaded files are still stored. Retry this route or return to dashboard home."
      homeHref="/dashboard/media"
      homeLabel="Media library"
    />
  );
}
