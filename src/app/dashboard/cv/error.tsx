"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardCvError({
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
      title="CV manager encountered an error"
      description="Uploaded CV files remain safe. Retry now or return to dashboard home."
      homeHref="/dashboard/cv"
      homeLabel="CV manager"
    />
  );
}
