import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrivateIP } from "@/lib/is-private-url";
import { isExcludedIP } from "@/lib/analytics-excluded-ips";

export const dynamic = "force-dynamic";

/** Ensure geoip-lite finds its data when running from Next.js/bundled context */
function ensureGeoIPDataDir() {
  if (!process.env.GEODATADIR) {
    process.env.GEODATADIR = path.join(process.cwd(), "node_modules", "geoip-lite", "data");
  }
}

const secret = process.env.ANALYTICS_SECRET;
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Dedup: avoid duplicate insert for same ip+path within 60s */
async function isRecentDuplicate(ip: string, path: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 1000);
  const existing = await prisma.pageView.findFirst({
    where: { ip, path, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

export async function POST(request: NextRequest) {
  let path: string;
  let ip: string;
  const fromMiddleware = !!secret && request.headers.get("x-analytics-secret") === secret;

  if (fromMiddleware) {
    let body: { path?: string; ip?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    path = typeof body.path === "string" ? body.path : "/";
    ip = typeof body.ip === "string" ? body.ip.trim() : "unknown";
  } else {
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const allowed = siteOrigin && (origin.startsWith(siteOrigin) || origin === "");
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const body = await request.json();
      path = typeof body.path === "string" ? body.path : "/";
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    ip = getClientIP(request);
  }

  if (isExcludedIP(ip)) {
    return NextResponse.json({ ok: true, skipped: "excluded" });
  }
  if (isPrivateIP(ip)) {
    return NextResponse.json({ ok: true, skipped: "private_ip" });
  }
  if (await isRecentDuplicate(ip, path)) {
    return NextResponse.json({ ok: true, skipped: "dedup" });
  }
  let country: string | null = null;
  let city: string | null = null;
  if (ip && ip !== "unknown") {
    try {
      ensureGeoIPDataDir();
      const geoip = (await import("geoip-lite")).default;
      const geo = geoip.lookup(ip);
      if (geo) {
        country = (geo.country ?? "").trim() || null;
        city = (geo.city ?? "").trim() || null;
      }
    } catch {
      // GeoIP data not available (e.g. at build time)
    }
  }
  try {
    await prisma.pageView.create({
      data: { path, ip, country, city },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Analytics view error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
