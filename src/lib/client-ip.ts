import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for access control / logging behind reverse proxies and CDNs.
 * Order: Cloudflare → common CDN/proxy headers → X-Forwarded-For (first hop).
 */
export function getTrustedClientIp(request: NextRequest): string {
  const h = request.headers;
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const trueClient = h.get("true-client-ip")?.trim();
  if (trueClient) return trueClient;
  const fly = h.get("fly-client-ip")?.trim();
  if (fly) return fly;
  const xri = h.get("x-real-ip")?.trim();
  if (xri) return xri;
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return "";
}
