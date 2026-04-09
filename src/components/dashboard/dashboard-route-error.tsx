"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  homeHref?: string;
  homeLabel?: string;
};

export function DashboardRouteError({
  error,
  reset,
  title,
  description,
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: DashboardRouteErrorProps) {
  useEffect(() => {
    console.error("Dashboard route error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[62vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Graceful failure
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {error.digest ? (
          <p className="mt-3 break-all rounded-md border border-border bg-muted/20 px-2 py-1 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={homeHref}>
              <LayoutDashboard className="h-4 w-4" />
              {homeLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
