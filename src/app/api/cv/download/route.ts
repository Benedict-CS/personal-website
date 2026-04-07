import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { s3Client, S3_BUCKET } from "@/lib/s3";
import { isPrivateIP } from "@/lib/is-private-url";
import { getCvDownloadFilename } from "@/lib/cv-download-filename";

export const dynamic = "force-dynamic";

const CV_S3_KEY = "cv.pdf";

function ensureGeoIPDataDir() {
  if (!process.env.GEODATADIR) {
    process.env.GEODATADIR = path.join(process.cwd(), "node_modules", "geoip-lite", "data");
  }
}

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Log CV download (always count; only skip private IP). Then stream PDF from S3. */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);

  if (!isPrivateIP(ip)) {
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
        data: { path: "/cv.pdf", ip, country, city },
      });
    } catch (e) {
      console.error("[cv/download] Failed to log PageView:", e);
    }
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
