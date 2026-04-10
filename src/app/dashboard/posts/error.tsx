"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function DashboardPostsError({
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
      title="Posts workspace hit an error"
      description="Your drafts remain intact. Retry this screen or return to the dashboard safely."
      homeHref="/dashboard/posts"
      homeLabel="Posts manager"
    />
  );
}
