/**
 * Proxy (Next.js 16): auth for /dashboard, request logging, analytics beacon.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { logRequest } from "@/lib/logger";
import { isAccessBlocked, shouldEnforceAccessBlockIp } from "@/lib/access-blocked-ips";
import { getTrustedClientIp } from "@/lib/client-ip";
import { getInternalAppOrigin } from "@/lib/internal-app-origin";
import { shouldSkipMiddlewareAnalytics } from "@/lib/analytics-skip-middleware";
import { ANALYTICS_OPT_OUT_COOKIE_NAME } from "@/lib/analytics-client-opt-out";
import { getOrCreateRequestId } from "@/lib/request-id";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const internalOrigin = getInternalAppOrigin(request);
  const pathname = request.nextUrl.pathname;
  const requestId = getOrCreateRequestId(request.headers);
  const ip = getTrustedClientIp(request);
  logRequest(request.method, pathname, { ip: ip || undefined, requestId });

  // Internal fetch from the block handler re-enters middleware with the same client IP in
  // X-Forwarded-For on some hosts; without this bypass the log API never runs.
  const accessBlockLogPost =
    request.method === "POST" && pathname === "/api/analytics/access-block-log";

  if (!accessBlockLogPost && isAccessBlocked(ip) && shouldEnforceAccessBlockIp(request)) {
    const logSecret =
      (process.env.ACCESS_BLOCK_LOG_SECRET || process.env.ANALYTICS_SECRET || "").trim();
    if (logSecret) {
      const logUrl = new URL("/api/analytics/access-block-log", internalOrigin);
      const logPromise = fetch(logUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Block-Log-Secret": logSecret,
        },
        body: JSON.stringify({
          ip: ip || "unknown",
          path: pathname,
          userAgent: (request.headers.get("user-agent") || "").slice(0, 512),
        }),
      }).catch(() => {});
      if (typeof event.waitUntil === "function") {
        event.waitUntil(logPromise);
      } else {
        void logPromise;
      }
    }
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-request-id": requestId,
        "Cache-Control": "no-store, private",
      },
    });
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/editor")) {
    const authHandler = withAuth({
      pages: { signIn: "/auth/signin" },
    });
    const authRes = await authHandler(request as never, event);
    const authResponse = authRes ?? NextResponse.next();
    if (authResponse instanceof NextResponse) {
      authResponse.headers.set("x-request-id", requestId);
    }
    return authResponse;
  }

  // Log page view for analytics (skip crawlers, /api, sitemap, feeds — less noise, less work)
  const secret = process.env.ANALYTICS_SECRET;
  const analyticsOptOutCookie = request.cookies.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value === "1";
  if (
    !analyticsOptOutCookie &&
    secret &&
    !shouldSkipMiddlewareAnalytics(pathname, request.headers.get("user-agent"), request.headers)
  ) {
    const clientIp = getTrustedClientIp(request);
    // Do not log when the edge cannot determine a public client IP (avoids polluting DB with "unknown").
    if (clientIp) {
      fetch(`${internalOrigin}/api/analytics/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Analytics-Secret": secret,
        },
        body: JSON.stringify({
          path: pathname,
          ip: clientIp,
          referrer: request.headers.get("referer") || "",
          userAgent: request.headers.get("user-agent") || "",
        }),
      }).catch(() => {});
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Match next.config.ts: only send HSTS when explicitly enabled (production HTTPS).
  if (
    process.env.ENABLE_HSTS === "true" &&
    request.headers.get("x-forwarded-proto") === "https"
  ) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
