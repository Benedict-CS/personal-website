import { NextRequest, NextResponse } from "next/server";
import { s3Client, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { isSafeS3ObjectKey } from "@/lib/safe-s3-object-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!isSafeS3ObjectKey(filename)) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: filename,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Get Content-Type
    const contentType = response.ContentType || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    console.error("Error serving file from RustFS:", error);
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse("File not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
