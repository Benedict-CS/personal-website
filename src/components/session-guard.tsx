"use client";

import { useEffect, useRef } from "react";
import { redirectToSignInSessionExpired } from "@/lib/session-expired";

/**
 * Runs once on mount: fetches a protected endpoint. On 401, redirects to sign-in
 * (session expired) so the user is not left on a stale dashboard view.
 */
export function SessionGuard() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    fetch("/api/posts", { method: "GET", credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          redirectToSignInSessionExpired();
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
