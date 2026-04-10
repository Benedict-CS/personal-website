import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { s3Client, S3_BUCKET } from "@/lib/s3";
import { isPrivateIP } from "@/lib/is-private-url";
import { isExcludedIP, normalizeIP } from "@/lib/analytics-excluded-ips";
import { getCvDownloadFilename } from "@/lib/cv-download-filename";
import { sanitizeReferrerForAnalytics } from "@/lib/analytics-referrer";
import { getTrustedClientIp } from "@/lib/client-ip";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

export const dynamic = "force-dynamic";

const CV_S3_KEY = "cv.pdf";

function ensureGeoIPDataDir() {
  if (!process.env.GEODATADIR) {
    process.env.GEODATADIR = path.join(process.cwd(), "node_modules", "geoip-lite", "data");
  }
}

function truncateMeta(value: string | null, max: number): string | null {
  if (!value) return null;
  const t = value.trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

/** Log CV download (same rules as page analytics: need a resolvable client IP; skip private and excluded). Then stream PDF from S3. */
export async function GET(request: NextRequest) {
  const rawIp = getTrustedClientIp(request);
  const ip = rawIp ? normalizeIP(rawIp) : "";
  const canLog =
    !!rawIp && !!ip && ip !== "unknown" && !isPrivateIP(rawIp) && !isExcludedIP(rawIp);

  if (canLog) {
    const rawUa = request.headers.get("user-agent");
    const userAgent = truncateMeta(rawUa, 512);
    const rawRef = request.headers.get("referer");
    const referrer = truncateMeta(sanitizeReferrerForAnalytics(rawRef), 512);
    void (async () => {
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
        // GeoIP optional
      }
      try {
        await prisma.pageView.create({
          data: {
            path: "/cv.pdf",
            ip,
            country,
            city,
            userAgent,
            referrer,
          },
        });
      } catch (e) {
        console.error("[cv/download] Failed to log PageView:", e);
      }
    })();
    void trackAnalyticsEvent({
      request,
      event: "CV_DOWNLOAD",
      details: {
        path: "/cv.pdf",
      },
    });
  }

  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: CV_S3_KEY })
    );

    if (!response.Body) {
      return new NextResponse("CV file not found", { status: 404 });
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = response.ContentType || "application/pdf";
    const filename = getCvDownloadFilename();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("[cv/download] S3 error:", error);
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse("CV file not found", { status: 404 });
    }
    return new NextResponse("Failed to serve CV", { status: 500 });
  }
}
