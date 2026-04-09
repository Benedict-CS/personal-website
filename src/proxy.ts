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
import { isPrimarySiteHost } from "@/lib/primary-site-host";
import { getOrCreateRequestId } from "@/lib/request-id";
import {
  negotiatePlatformLocale,
  SAAS_LOCALE_COOKIE,
  isPlatformLocale,
} from "@/i18n/platform";

function maybeSetSaasLocaleCookie(request: NextRequest, response: Response): Response {
  if (!(response instanceof NextResponse)) {
    return response;
  }
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/s/") && !pathname.startsWith("/dashboard/sites")) {
    return response;
  }
  const current = request.cookies.get(SAAS_LOCALE_COOKIE)?.value;
  if (current && isPlatformLocale(current)) {
    return response;
  }
  const negotiated = negotiatePlatformLocale(request.headers.get("accept-language"));
  response.cookies.set(SAAS_LOCALE_COOKIE, negotiated, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

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
    return maybeSetSaasLocaleCookie(
      request,
      new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-request-id": requestId,
          "Cache-Control": "no-store, private",
        },
      })
    );
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
    return maybeSetSaasLocaleCookie(request, authResponse);
  }

  // Edge control plane: custom domain routing + tenant rate limiting.
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostName = host.split(":")[0]?.toLowerCase() || "";
  const shouldRouteTenant =
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/s/");

  // Custom-domain SaaS routing only; primary blog host skips DB/Redis on every navigation.
  if (hostName && shouldRouteTenant && !isPrimarySiteHost(host)) {
    try {
      const edgeRes = await fetch(`${internalOrigin}/api/infra/edge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.EDGE_CONTROL_SECRET
            ? { "X-Edge-Control-Secret": process.env.EDGE_CONTROL_SECRET }
            : {}),
        },
        body: JSON.stringify({ host: hostName, ip: ip || "unknown" }),
      });
      if (edgeRes.status === 429) {
        return maybeSetSaasLocaleCookie(
          request,
          NextResponse.json(
            { error: "Too many requests for this tenant" },
            {
              status: 429,
              headers: {
                "x-request-id": requestId,
                "Cache-Control": "no-store, private",
                "Retry-After": "60",
              },
            }
          )
        );
      }
      if (edgeRes.ok) {
        const edgeData = (await edgeRes.json()) as { allowed?: boolean; siteSlug?: string };
        if (edgeData.allowed && edgeData.siteSlug) {
          const target = request.nextUrl.clone();
          target.pathname = `/s/${edgeData.siteSlug}${pathname === "/" ? "" : pathname}`;
          const rewriteRes = NextResponse.rewrite(target);
          rewriteRes.headers.set("x-request-id", requestId);
          return maybeSetSaasLocaleCookie(request, rewriteRes);
        }
      }
    } catch {
      // Continue with normal flow if edge control plane is unreachable.
    }
  }

  if (pathname.startsWith("/s/")) {
    const parts = pathname.split("/").filter(Boolean);
    const siteSlug = parts[1] || "site";
    const pageSlug = parts[2] || "home";
    const cookieKey = `abv_${siteSlug}_${pageSlug}`;
    const existingVariant = request.cookies.get(cookieKey)?.value;
    const variant = existingVariant === "A" || existingVariant === "B" ? existingVariant : Math.random() < 0.5 ? "A" : "B";
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    if (!existingVariant) {
      response.cookies.set(cookieKey, variant, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return maybeSetSaasLocaleCookie(request, response);
  }

  // Log page view for analytics (skip crawlers, /api, sitemap, feeds — less noise, less work)
  const secret = process.env.ANALYTICS_SECRET;
  const analyticsOptOutCookie = request.cookies.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value === "1";
  if (
    !analyticsOptOutCookie &&
    secret &&
    !shouldSkipMiddlewareAnalytics(pathname, request.headers.get("user-agent"))
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
  return maybeSetSaasLocaleCookie(request, res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

