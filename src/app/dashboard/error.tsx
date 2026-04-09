"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Copy, LayoutDashboard, RefreshCw } from "lucide-react";
import { useToast } from "@/contexts/toast-context";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  const copyDigest = useCallback(async () => {
    let d = "";
    try {
      if (error && typeof error === "object" && "digest" in error) {
        d = String((error as { digest?: string }).digest ?? "");
      }
    } catch {
      return;
    }
    if (!d) return;
    try {
      await navigator.clipboard.writeText(String(d));
      toast("Reference copied to clipboard", "success");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy to clipboard", "error");
    }
  }, [error, toast]);

  const errorDigest = useMemo(() => {
    try {
      if (error && typeof error === "object" && "digest" in error) {
        return String((error as { digest?: string }).digest ?? "");
      }
    } catch {
      return "";
    }
    return "";
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card/85 p-8 shadow-[var(--elevation-3)] backdrop-blur-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="mb-2 text-xl font-bold text-foreground">Error</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          An unexpected error occurred in the dashboard. You can try again or return to a safe area.
        </p>
        {errorDigest ? (
          <div className="mb-6 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reference (for support)
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{errorDigest}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={copyDigest}
                aria-label="Copy error reference to clipboard"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => {
              try {
                reset();
              } catch {
                window.location.href = "/dashboard";
              }
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard home
            </Link>
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
