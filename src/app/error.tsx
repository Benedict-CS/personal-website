"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Home, RefreshCw, BookOpen } from "lucide-react";

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

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 container-narrow">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500">Something went wrong</p>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Error</h1>
      <p className="mb-8 max-w-md text-center text-slate-600">
        An unexpected error occurred. You can try again or go back to the home page.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="gap-2">
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
      </div>
      <p className="mt-10 text-sm text-slate-500">
        {siteConfig.name} · {siteConfig.url}
      </p>
    </div>
  );
}
