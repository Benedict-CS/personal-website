"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

const CHUNK_RELOAD_KEY = "chunk-load-reload";

function ChunkLoadRecovery() {
  useEffect(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);

    function handleError(e: ErrorEvent) {
      const msg = e.message || "";
      if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
        const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
        if (!reloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
          window.location.reload();
        }
      }
    }

    function handleRejection(e: PromiseRejectionEvent) {
      const msg = String(e.reason?.message ?? e.reason ?? "");
      if (msg.includes("ChunkLoadError") || msg.includes("Failed to fetch dynamically imported module")) {
        const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
        if (!reloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
          window.location.reload();
        }
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChunkLoadRecovery />
      {children}
    </SessionProvider>
  );
}
