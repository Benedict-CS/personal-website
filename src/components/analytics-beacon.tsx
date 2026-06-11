"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isAnalyticsOptedOutInBrowser } from "@/lib/analytics-client-opt-out";

/** Max plausible single-page dwell, mirrored server-side. */
const MAX_DWELL_SECONDS = 30 * 60;

/** Sends page view on load and active dwell time when leaving (for analytics). */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);
  const activeMsRef = useRef<number>(0);
  const lastActiveAtRef = useRef<number>(0);
  const leaveSentRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard") || pathname.startsWith("/api")) return;
    if (isAnalyticsOptedOutInBrowser()) return;

    activeMsRef.current = 0;
    lastActiveAtRef.current = typeof document !== "undefined" && document.visibilityState === "visible" ? Date.now() : 0;
    leaveSentRef.current = false;

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

    const accumulateActive = () => {
      if (lastActiveAtRef.current > 0) {
        activeMsRef.current += Date.now() - lastActiveAtRef.current;
        lastActiveAtRef.current = 0;
      }
    };

    const sendLeave = () => {
      if (leaveSentRef.current) return;
      accumulateActive();
      const duration = Math.min(Math.round(activeMsRef.current / 1000), MAX_DWELL_SECONDS);
      if (duration <= 0) return;
      leaveSentRef.current = true;
      try {
        const body = JSON.stringify({ path: pathname, durationSeconds: duration });
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/analytics/leave", blob);
          return;
        }
        fetch("/api/analytics/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendLeave();
      } else if (document.visibilityState === "visible") {
        lastActiveAtRef.current = Date.now();
        leaveSentRef.current = false;
      }
    };

    window.addEventListener("pagehide", sendLeave);
    window.addEventListener("beforeunload", sendLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      sendLeave();
      window.removeEventListener("pagehide", sendLeave);
      window.removeEventListener("beforeunload", sendLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
