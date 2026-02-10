import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard")) {
    return withAuth({
      pages: { signIn: "/auth/signin" },
    })(request as never, event);
  }

  // Log page view for analytics (non-dashboard pages only)
  const secret = process.env.ANALYTICS_SECRET;
  if (secret) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    fetch(`${request.nextUrl.origin}/api/analytics/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytics-Secret": secret,
      },
      body: JSON.stringify({ path: pathname, ip }),
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/",
    "/about",
    "/contact",
    "/auth/signin",
    "/blog",
    "/blog/:path*",
  ],
};
