"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root-level error boundary. Renders when an error is not caught by error.tsx.
 * Must define its own <html> and <body> (replaces root layout).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: "0.5rem" }}>
            Something went wrong
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Error</h1>
          <p style={{ color: "#475569", marginBottom: "2rem" }}>
            An unexpected error occurred. You can try again or go back to the home page.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                background: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                color: "#0f172a",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Home
            </Link>
            <Link
              href="/blog"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                color: "#0f172a",
                textDecoration: "none",
                fontSize: "0.875rem",
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
