import { NextResponse } from "next/server";
import { listS3Objects } from "@/lib/s3";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    // List all objects from RustFS (S3)
    const objects = await listS3Objects();

    // Map to API format (exclude cv.pdf, managed by CV page)
    const fileList = objects
      .filter((obj) => obj.Key && obj.Key !== "cv.pdf")
      .map((obj) => ({
        name: obj.Key!,
        size: obj.Size || 0,
        createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
        url: `/api/media/serve/${obj.Key}`,
      }));

    // Sort by creation time, newest first
    fileList.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(fileList);
  } catch (error) {
    console.error("Error fetching media files:", error);
    return NextResponse.json(
      { error: "Failed to fetch media files" },
      { status: 500 }
    );
  }
}
