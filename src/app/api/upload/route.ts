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

    const { buffer: finalBuffer, contentType, fileName: finalFileName } = await processImage(
      buffer,
      file.type,
      fileName
    );

    const url = await uploadToS3(finalFileName, finalBuffer, contentType);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
