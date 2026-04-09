import { NextResponse } from "next/server";

/**
 * Headers for liveness/readiness endpoints so intermediaries never cache probe results.
 */
export const HEALTH_PROBE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export function jsonHealthProbe<T>(body: T, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: HEALTH_PROBE_HEADERS });
}

export function emptyHealthProbe(status: number): NextResponse {
  return new NextResponse(null, { status, headers: HEALTH_PROBE_HEADERS });
}
