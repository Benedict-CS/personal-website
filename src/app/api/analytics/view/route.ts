import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrivateIP } from "@/lib/is-private-url";
import { isExcludedIP, normalizeIP } from "@/lib/analytics-excluded-ips";
import { getRequestOrigin } from "@/lib/get-request-origin";
import { getBlogPostSlugFromPath, incrementPublishedPostViewCount } from "@/lib/blog-analytics";

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

function truncateMeta(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

type ViewBody = {
  path?: string;
  ip?: string;
  referrer?: string;
  userAgent?: string;
};

/** Dedup: avoid duplicate insert for same ip+path within 60s */
async function isRecentDuplicate(ip: string, viewPath: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 1000);
  const existing = await prisma.pageView.findFirst({
    where: { ip, path: viewPath, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

export async function POST(request: NextRequest) {
  let body: ViewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const viewPath = typeof body.path === "string" ? body.path : "/";
  const referrer = truncateMeta(body.referrer, 512);
  const userAgent = truncateMeta(body.userAgent, 512);

  let ip: string;
  const fromMiddleware = !!secret && request.headers.get("x-analytics-secret") === secret;

  if (fromMiddleware) {
    ip = typeof body.ip === "string" ? body.ip.trim() : "unknown";
  } else {
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const requestOrigin = getRequestOrigin(request);
    const allowed =
      origin === "" ||
      (siteOrigin && origin.startsWith(siteOrigin)) ||
      (requestOrigin && origin.startsWith(requestOrigin));
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    ip = getClientIP(request);
  }

  if (isExcludedIP(ip)) {
    return NextResponse.json({ ok: true, skipped: "excluded" });
  }
  if (isPrivateIP(ip)) {
    return NextResponse.json({ ok: true, skipped: "private_ip" });
  }
  const canonicalIP = normalizeIP(ip);
  if (await isRecentDuplicate(canonicalIP, viewPath)) {
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
      data: {
        path: viewPath,
        ip: canonicalIP,
        country,
        city,
        referrer,
        userAgent,
      },
    });
    const slug = getBlogPostSlugFromPath(viewPath);
    if (slug) {
      try {
        await incrementPublishedPostViewCount(slug);
      } catch (e) {
        console.error("Blog view count increment error:", e);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Analytics view error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
