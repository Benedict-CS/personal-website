/**
 * Next.js server bootstrap hook (runs per runtime: nodejs or edge).
 * Loads Sentry for server/edge and wires request error capture for App Router.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/** Capture errors from Server Components, middleware, and proxies (Next.js 15+). */
export const onRequestError = Sentry.captureRequestError;
