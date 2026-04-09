"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PenSquare, RefreshCw } from "lucide-react";

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Editor error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Editor fallback</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">The immersive editor hit an error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your content is not deleted. Reload this editor or return to a safe dashboard route.
        </p>
        {error.digest ? (
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry editor
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/editor/home">
              <PenSquare className="h-4 w-4" />
              Open home editor
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
