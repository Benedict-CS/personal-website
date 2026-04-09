"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/contexts/toast-context";

const HEALTH_INTERVAL_MS = 45_000;
const RETRY_MS = 5000;
const INITIAL_DELAY_MS = 2500;

/**
 * On dashboard routes, periodically probes GET /api/health. On transient failures,
 * shows a single non-intrusive toast and retries with a shorter interval until OK.
 */
export function DashboardConnectivityWatcher() {
  const pathname = usePathname();
  const { toast } = useToast();
  const degradedRef = useRef(false);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, ms);
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          if (degradedRef.current) {
            degradedRef.current = false;
            if (toastShownRef.current) {
              toastShownRef.current = false;
              toast("Connection restored", "success");
            }
          }
          schedule(HEALTH_INTERVAL_MS);
        } else {
          degradedRef.current = true;
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast("Reconnecting to server…", "info");
          }
          schedule(RETRY_MS);
        }
      } catch {
        if (cancelled) return;
        degradedRef.current = true;
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast("Reconnecting to server…", "info");
        }
        schedule(RETRY_MS);
      }
    };

    schedule(INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, toast]);

  return null;
}
