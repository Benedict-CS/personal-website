"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, LayoutDashboard, PenSquare, RefreshCw } from "lucide-react";

/**
 * Editor route error boundary.
 *
 * Improvements over the previous version:
 *  1) `Sentry.captureException` so production crashes show up server-side with a stack trace.
 *  2) Shows the actual `error.message` (not just a generic copy) so the operator can self-diagnose
 *     and copy/paste it when reporting; previously we only printed `error.digest`, which is just
 *     a hash without context.
 *  3) "Copy details" button to send a structured snippet of {name, message, digest, url} for
 *     pasting into bug reports — fixes the "I keep seeing this but nobody knows what it is" loop.
 */
export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Editor error boundary:", error);
    try {
      Sentry.captureException(error, {
        tags: { surface: "editor", boundary: "route-error" },
      });
    } catch {
      /* Sentry must never crash the boundary itself. */
    }
  }, [error]);

  const handleCopyDetails = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const payload = [
      `name: ${error?.name ?? "Error"}`,
      `message: ${error?.message ?? ""}`,
      `digest: ${error?.digest ?? ""}`,
      `url: ${url}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Editor fallback</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">The immersive editor hit an error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your content is not deleted. Reload this editor or return to a safe dashboard route.
        </p>

        {error?.message ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        ) : null}

        {error?.digest ? (
          <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry editor
          </Button>
          <Button onClick={handleCopyDetails} variant="outline" className="gap-2">
            <ClipboardCopy className="h-4 w-4" />
            {copied ? "Copied" : "Copy details"}
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
