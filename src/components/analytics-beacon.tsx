"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Sends page view on load and duration when leaving (for analytics). */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard") || pathname.startsWith("/api")) return;
    startRef.current = Date.now();
    if (sent.current !== pathname) {
      sent.current = pathname;
      fetch("/api/analytics/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: typeof document !== "undefined" ? document.referrer || "" : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
        }),
      }).catch(() => {});
    }

    const onLeave = () => {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (duration > 0 && duration < 86400) {
        fetch("/api/analytics/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname, durationSeconds: duration }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };

    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
