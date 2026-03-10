"use client";

import { useState, useEffect } from "react";

const MAX_SESSION_SECONDS = 60 * 60; // 1 hour - cap display to match auth maxAge

function formatRemaining(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0h 0m";
  const capped = Math.min(secondsLeft, MAX_SESSION_SECONDS);
  const h = Math.floor(capped / 3600);
  const m = Math.floor((capped % 3600) / 60);
  return `${h}h ${m}m`;
}

export function SessionCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => {
    const now = Math.floor(Date.now() / 1000);
    const raw = Math.max(0, expiresAt - now);
    return Math.min(raw, MAX_SESSION_SECONDS);
  });

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const raw = Math.max(0, expiresAt - now);
      setRemaining(Math.min(raw, MAX_SESSION_SECONDS));
    };
    tick();
    const interval = setInterval(tick, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-xs font-medium text-amber-700">Session expired</span>;

  return (
    <span className="text-xs text-[var(--muted-foreground)]" title="Session expires in">
      Session: {formatRemaining(remaining)}
    </span>
  );
}
