"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WARN_WHEN_REMAINING_SECONDS = 5 * 60; // 5 min

export function SessionExpiryBanner() {
  const { data: session, status } = useSession();
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiresAt = (session as { expiresAt?: number } | null)?.expiresAt;

  useEffect(() => {
    if (status !== "authenticated" || typeof expiresAt !== "number") {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setRemaining(Math.max(0, expiresAt - now));
    };
    tick();
    const interval = setInterval(tick, 30 * 1000); // every 30s
    return () => clearInterval(interval);
  }, [status, expiresAt]);

  if (remaining === null || remaining > WARN_WHEN_REMAINING_SECONDS || remaining <= 0) return null;

  const minutes = Math.ceil(remaining / 60);
  return (
    <div className="sticky top-16 z-40 flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Session expiring in {minutes} min. Sign in again to stay in.
      </span>
      <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/dashboard")}`}>
        <Button size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-100">
          Sign in again
        </Button>
      </Link>
    </div>
  );
}
