/**
 * Proxy (Next.js 16): auth for /dashboard, request logging, analytics beacon.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { logRequest } from "@/lib/logger";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  logRequest(request.method, pathname, { ip: ip || undefined });

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

  if (hostName && shouldRouteTenant) {
    try {
      const edgeRes = await fetch(`${request.nextUrl.origin}/api/infra/edge`, {
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

  // Log page view for analytics (non-dashboard pages only)
  const secret = process.env.ANALYTICS_SECRET;
  if (secret) {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    fetch(`${request.nextUrl.origin}/api/analytics/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytics-Secret": secret,
      },
      body: JSON.stringify({ path: pathname, ip: clientIp }),
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

