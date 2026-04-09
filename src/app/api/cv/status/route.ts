import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireSession } from "@/lib/auth";
import { s3Client, S3_BUCKET } from "@/lib/s3";

const CV_S3_KEY = "cv.pdf";

/**
 * GET /api/cv/status — whether cv.pdf exists in S3 and its LastModified / size (auth required).
 */
export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const head = await s3Client.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: CV_S3_KEY })
    );
    return NextResponse.json({
      exists: true,
      lastModified: head.LastModified?.toISOString() ?? null,
      contentLength: typeof head.ContentLength === "number" ? head.ContentLength : null,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({
        exists: false,
        lastModified: null,
        contentLength: null,
      });
    }
    console.error("[cv/status] HeadObject failed:", error);
    return NextResponse.json({ error: "Failed to check CV" }, { status: 500 });
  }
}
