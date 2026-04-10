"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/**
 * Root-level error boundary. Renders when an error is not caught by error.tsx.
 * Must define its own <html> and <body> (replaces root layout).
 * Light-only, premium UI with glass-style panel.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    console.error("Global error boundary:", error);
    Sentry.captureException(error);
  }, [error]);

  const digest = useMemo(() => {
    try {
      if (error && typeof error === "object" && "digest" in error) {
        return String((error as { digest?: string }).digest ?? "");
      }
    } catch {
      /* ignore */
    }
    return "";
  }, [error]);

  const glassBg = "oklch(1 0 0 / 0.72)";
  const border = "oklch(0.92 0.012 255)";
  const shadow = "0 2px 8px oklch(0.2 0.02 265 / 0.06), 0 8px 24px oklch(0.2 0.02 265 / 0.08)";
  const foreground = "oklch(0.145 0.04 265)";
  const muted = "oklch(0.50 0.04 265)";
  const primary = "oklch(0.208 0.042 265.755)";
  const primaryFg = "oklch(0.984 0.003 247.858)";
  const background = "oklch(0.99 0.002 247)";

  const tryRecover = () => {
    if (resetting) return;
    setResetting(true);
    try {
      reset();
      window.setTimeout(() => setResetting(false), 1800);
    } catch {
      window.location.replace("/");
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          background,
          color: foreground,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            textAlign: "center",
            background: glassBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${border}`,
            borderRadius: "0.75rem",
            boxShadow: shadow,
            padding: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: muted,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Error</h1>
          <p style={{ color: muted, marginBottom: "1.5rem", lineHeight: 1.5 }}>
            An unexpected error occurred. You can try again or go back to the home page.
          </p>
          {digest ? (
            <p
              style={{
                fontSize: "0.7rem",
                color: muted,
                fontFamily: "ui-monospace, monospace",
                marginBottom: "1rem",
                wordBreak: "break-all",
              }}
            >
              Reference: {digest}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={tryRecover}
              disabled={resetting}
              style={{
                padding: "0.5rem 1rem",
                background: primary,
                color: primaryFg,
                border: "none",
                borderRadius: "0.375rem",
                cursor: resetting ? "not-allowed" : "pointer",
                opacity: resetting ? 0.82 : 1,
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              {resetting ? "Recovering..." : "Try again"}
            </button>
            <Link
              href="/"
              style={{
                padding: "0.5rem 1rem",
                border: `1px solid ${border}`,
                borderRadius: "0.375rem",
                color: foreground,
                textDecoration: "none",
                fontSize: "0.875rem",
                background: "transparent",
              }}
            >
              Home
            </Link>
            <Link
              href="/blog"
              style={{
                padding: "0.5rem 1rem",
                border: `1px solid ${border}`,
                borderRadius: "0.375rem",
                color: foreground,
                textDecoration: "none",
                fontSize: "0.875rem",
                background: "transparent",
              }}
            >
              Blog
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
