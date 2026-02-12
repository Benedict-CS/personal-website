import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrivateIP } from "@/lib/is-private-url";

export const dynamic = "force-dynamic";

function ensureGeoIPDataDir() {
  if (!process.env.GEODATADIR) {
    process.env.GEODATADIR = path.join(process.cwd(), "node_modules", "geoip-lite", "data");
  }
}

const excludedIPs = new Set(
  (process.env.ANALYTICS_EXCLUDED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Build redirect base URL from request (avoids 0.0.0.0 when server binds to all interfaces). */
function getRedirectBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol?.replace(":", "") ?? "https");
  if (host && host !== "0.0.0.0:3000" && host !== "0.0.0.0") {
    return `${proto}://${host}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }
  return req.nextUrl.origin;
}

/** Log CV download then redirect to S3-served CV (/api/media/serve/cv.pdf). */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  if (!excludedIPs.has(ip) && !isPrivateIP(ip)) {
    let country: string | null = null;
    let city: string | null = null;
    try {
      ensureGeoIPDataDir();
      const geoip = (await import("geoip-lite")).default;
      const geo = geoip.lookup(ip);
      if (geo) {
        country = (geo.country ?? "").trim() || null;
        city = (geo.city ?? "").trim() || null;
      }
    } catch {
      // GeoIP data not available at build time
    }
    try {
      await prisma.pageView.create({
        data: { path: "/cv.pdf", ip, country, city },
      });
    } catch {
      // ignore
    }
  }
  const base = getRedirectBase(request);
  return NextResponse.redirect(`${base}/api/media/serve/cv.pdf`, 302);
}
