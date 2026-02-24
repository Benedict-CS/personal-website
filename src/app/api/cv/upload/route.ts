import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";

const CV_S3_KEY = "cv.pdf";

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

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const url = await uploadToS3(CV_S3_KEY, buffer, "application/pdf");

    return NextResponse.json(
      { message: "CV uploaded successfully", url },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading CV:", error);
    return NextResponse.json(
      { error: "Failed to upload CV" },
      { status: 500 }
    );
  }
}
