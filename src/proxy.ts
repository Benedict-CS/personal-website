/**
 * Proxy (Next.js 16): auth for /dashboard, request logging, analytics beacon.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { logRequest } from "@/lib/logger";
import { isAccessBlocked } from "@/lib/access-blocked-ips";
import { getTrustedClientIp } from "@/lib/client-ip";
import { getInternalAppOrigin } from "@/lib/internal-app-origin";
import { shouldSkipMiddlewareAnalytics } from "@/lib/analytics-skip-middleware";
import { ANALYTICS_OPT_OUT_COOKIE_NAME } from "@/lib/analytics-client-opt-out";
import { isPrimarySiteHost } from "@/lib/primary-site-host";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const internalOrigin = getInternalAppOrigin(request);
  const pathname = request.nextUrl.pathname;
  const ip = getTrustedClientIp(request);
  logRequest(request.method, pathname, { ip: ip || undefined });

  // Internal fetch from the block handler re-enters middleware with the same client IP in
  // X-Forwarded-For on some hosts; without this bypass the log API never runs.
  const accessBlockLogPost =
    request.method === "POST" && pathname === "/api/analytics/access-block-log";

  if (!accessBlockLogPost && isAccessBlocked(ip)) {
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
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/editor")) {
    return withAuth({
      pages: { signIn: "/auth/signin" },
    })(request as never, event);
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
        return NextResponse.json({ error: "Too many requests for this tenant" }, { status: 429 });
      }
      if (edgeRes.ok) {
        const edgeData = (await edgeRes.json()) as { allowed?: boolean; siteSlug?: string };
        if (edgeData.allowed && edgeData.siteSlug) {
          const target = request.nextUrl.clone();
          target.pathname = `/s/${edgeData.siteSlug}${pathname === "/" ? "" : pathname}`;
          return NextResponse.rewrite(target);
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
    if (!existingVariant) {
      response.cookies.set(cookieKey, variant, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  // Log page view for analytics (skip crawlers, /api, sitemap, feeds — less noise, less work)
  const secret = process.env.ANALYTICS_SECRET;
  const analyticsOptOutCookie = request.cookies.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value === "1";
  if (
    !analyticsOptOutCookie &&
    secret &&
    !shouldSkipMiddlewareAnalytics(pathname, request.headers.get("user-agent"))
  ) {
    const clientIp = getTrustedClientIp(request) || "unknown";
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

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (request.headers.get("x-forwarded-proto") === "https") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

