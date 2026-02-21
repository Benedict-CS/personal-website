import type { NextRequest } from "next/server";

/**
 * Get the origin as seen by the client (for CORS / same-origin checks).
 * In Docker or behind a proxy, request.url may be internal (e.g. http://localhost:3000).
 * Use Host and X-Forwarded-Proto so backup/secondary hosts (e.g. http://192.168.1.139:3001) are allowed.
 */
export function getRequestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host && host !== "0.0.0.0:3000" && host !== "0.0.0.0") {
    return `${proto.replace(/:$/, "")}://${host}`.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}
