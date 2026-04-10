import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeIP } from "@/lib/analytics-excluded-ips";
import { getRequestOrigin } from "@/lib/get-request-origin";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Client sends when leaving a page; we update the most recent PageView for this IP+path with duration. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  const requestOrigin = getRequestOrigin(request);
  const allowed =
    origin === "" ||
    (siteOrigin && origin.startsWith(siteOrigin)) ||
    (requestOrigin && origin.startsWith(requestOrigin));
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { path?: string; durationSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path : "/";
  const duration = typeof body.durationSeconds === "number" ? Math.round(body.durationSeconds) : null;
  if (duration === null || duration < 0) {
    return NextResponse.json({ ok: true });
  }
  const ipRaw = getClientIP(request);
  const ip = normalizeIP(ipRaw);
  if (!ip || ip === "unknown") {
    return NextResponse.json({ ok: true });
  }
  const { ok: rateAllowed, remaining } = await checkRateLimitAsync(ip, "analytics_leave");
  if (!rateAllowed) {
    return NextResponse.json(
      { ok: true, skipped: "rate_limited" },
      { headers: { "X-RateLimit-Remaining": "0", "Cache-Control": "no-store, private" } }
    );
  }
  const since = new Date(Date.now() - 30 * 60 * 1000);
  try {
    const row = await prisma.pageView.findFirst({
      where: { ip, path, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (row) {
      await prisma.pageView.update({
        where: { id: row.id },
        data: { durationSeconds: duration },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { "X-RateLimit-Remaining": String(remaining) } });
  } catch (e) {
    console.error("Analytics leave error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
