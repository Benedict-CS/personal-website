"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteUrl } from "@/config/site";
import { Home, RefreshCw, BookOpen, LayoutDashboard } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  const digest = useMemo(() => {
    try {
      if (error && typeof error === "object" && "digest" in error) {
        return String((error as { digest?: string }).digest ?? "");
      }
    } catch {
      /* ignore */
    }
    return "";
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 container-narrow">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Something went wrong</p>
      <h1 className="mb-2 text-2xl font-bold text-foreground">Error</h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        An unexpected error occurred. You can try again or go back to the home page.
      </p>
      {digest ? (
        <p className="mb-6 max-w-md break-all text-center font-mono text-xs text-muted-foreground">
          Reference: {digest}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => {
            try {
              reset();
            } catch {
              window.location.href = "/";
            }
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/blog">
            <BookOpen className="h-4 w-4" />
            Blog
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        My Site · {siteUrl}
      </p>
    </div>
  );
}
