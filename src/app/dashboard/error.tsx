"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-8 shadow-[var(--glass-shadow-hover)] backdrop-blur-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Something went wrong
        </p>
        <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">Error</h1>
        <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
          An unexpected error occurred in the dashboard. You can try again or return to analytics.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
