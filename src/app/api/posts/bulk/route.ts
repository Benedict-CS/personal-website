import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action: string; ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Use { action: 'publish'|'unpublish'|'delete', ids: string[] }" },
      { status: 400 }
    );
  }

  const { action, ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const validIds = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid ids" }, { status: 400 });
  }

  try {
    if (action === "delete") {
      const result = await prisma.post.deleteMany({
        where: { id: { in: validIds } },
      });
      return NextResponse.json({ updated: result.count, action: "delete" });
    }

    if (action === "publish" || action === "unpublish") {
      const published = action === "publish";
      const result = await prisma.post.updateMany({
        where: { id: { in: validIds } },
        data: { published },
      });
      return NextResponse.json({ updated: result.count, action });
    }

    return NextResponse.json(
      { error: "action must be publish, unpublish, or delete" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Posts bulk error:", e);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
