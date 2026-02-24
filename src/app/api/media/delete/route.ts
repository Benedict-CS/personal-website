import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { deleteFromS3 } from "@/lib/s3";

/** POST /api/media/delete — body: { keys: string[] }. Delete selected files from S3. Auth required. */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  let body: { keys?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const keys = Array.isArray(body.keys) ? body.keys.filter((k) => typeof k === "string" && k.trim() && k !== "cv.pdf") : [];
  if (keys.length === 0) {
    return NextResponse.json({ error: "No keys to delete" }, { status: 400 });
  }
  try {
    for (const key of keys) {
      await deleteFromS3(key);
    }
    return NextResponse.json({ deleted: keys.length, keys });
  } catch (e) {
    console.error("Media delete error:", e);
    return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
  }
}
