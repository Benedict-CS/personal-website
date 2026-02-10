"use client";

import { useState, useEffect } from "react";

function formatRemaining(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0h 0m";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  return `${h}h ${m}m`;
}

export function SessionCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expiresAt - now);
  });

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setRemaining(Math.max(0, expiresAt - now));
    };
    tick();
    const interval = setInterval(tick, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-xs text-amber-700">Session expired</span>;

  return (
    <span className="text-xs text-slate-500" title="Session expires in">
      Session: {formatRemaining(remaining)}
    </span>
  );
}
