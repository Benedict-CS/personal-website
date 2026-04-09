import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { processImage } from "@/lib/image-process";
import { requireSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${originalName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processed = await processImage(buffer, file.type, fileName);

    const variantPayload: Array<{ descriptor: number; url: string }> = [];
    if (processed.variants?.length) {
      for (const v of processed.variants) {
        const vUrl = await uploadToS3(v.fileName, v.buffer, "image/webp");
        variantPayload.push({ descriptor: v.descriptor, url: vUrl });
      }
    }

    const url = await uploadToS3(processed.fileName, processed.buffer, processed.contentType);

    return NextResponse.json(
      {
        url,
        width: processed.width ?? null,
        height: processed.height ?? null,
        variants: variantPayload.length > 0 ? variantPayload : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isStorage = /S3|AWS|PutObject|Multipart|credentials|ENOTFOUND|ECONN|timeout|socket|rustfs|minio/i.test(
      message
    );
    return NextResponse.json(
      {
        error: isStorage
          ? "Image storage is temporarily unavailable. Try again in a moment."
          : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
