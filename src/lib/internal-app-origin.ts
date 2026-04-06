import type { NextRequest } from "next/server";

/**
 * Base URL for server-side fetch from proxy/middleware to this same app.
 * In Docker, request.nextUrl.origin is often the public HTTPS host; the container
 * may not reach that URL (hairpin). Set INTERNAL_APP_ORIGIN=http://127.0.0.1:3000.
 */
export function getInternalAppOrigin(request: NextRequest): string {
  const fromEnv = process.env.INTERNAL_APP_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return request.nextUrl.origin;
}
