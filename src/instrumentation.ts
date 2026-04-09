/**
 * Next.js server bootstrap hook (runs once per Node.js server process).
 * Use for optional startup wiring (APM, metrics registries). Avoid heavy work here.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Intentionally minimal: Sentry is configured via next.config / sentry.*.config.ts.
}
