"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WARN_WHEN_REMAINING_SECONDS = 5 * 60; // 5 min

export function SessionExpiryBanner() {
  const { data: session, status } = useSession();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const expiresAt = (session as { expiresAt?: number } | null)?.expiresAt;

  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining =
    status === "authenticated" && typeof expiresAt === "number"
      ? Math.max(0, expiresAt - nowSec)
      : null;

  if (remaining === null || remaining > WARN_WHEN_REMAINING_SECONDS || remaining <= 0) return null;

  const minutes = Math.ceil(remaining / 60);
  return (
    <div className="sticky top-16 z-40 flex items-center justify-between gap-4 border-b border-amber-200/90 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-[var(--shadow-sm)]">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        Session expiring in {minutes} min. Sign in again to stay in.
      </span>
      <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/dashboard/analytics")}`}>
        <Button size="sm" variant="outline" className="border-amber-300 bg-[var(--card)] hover:bg-amber-100 text-amber-900 rounded-lg transition-colors duration-200">
          Sign in again
        </Button>
      </Link>
    </div>
  );
}
