/**
 * Client-side Sentry bootstrap (Next.js instrumentation-client convention).
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

/** App Router navigation spans (required by @sentry/nextjs when using instrumentation-client). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
