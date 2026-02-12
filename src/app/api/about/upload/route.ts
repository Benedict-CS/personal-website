import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";
import { processImage } from "@/lib/image-process";

// S3 key prefix for About images (single segment, no slash)
const ABOUT_PREFIX = "about-";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "profile" | "school" | "project" | "company"
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["profile", "school", "project", "company"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'profile', 'school', 'project', or 'company'" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Same naming as before: fixed key per type/name so uploads overwrite
    let baseName: string;
    if (type === "profile") {
      baseName = "profile.jpg";
    } else if (name) {
      const sanitizedName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-");
      const ext = path.extname(file.name.replace(/[^a-zA-Z0-9.-]/g, "_")) || ".jpg";
      baseName = `${type}-${sanitizedName}${ext}`;
    } else {
      const timestamp = Date.now();
      const ext = path.extname(file.name.replace(/[^a-zA-Z0-9.-]/g, "_")) || ".jpg";
      baseName = `${type}-${timestamp}${ext}`;
    }

    const s3Key = ABOUT_PREFIX + baseName;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { buffer: finalBuffer, contentType, fileName: finalKey } = await processImage(
      buffer,
      file.type,
      s3Key
    );

    const url = await uploadToS3(finalKey, finalBuffer, contentType);

    return NextResponse.json(
      { message: "File uploaded successfully", url, fileName: finalKey.replace(/^about-/, "") },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading About file:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
