import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/posts/preview?token=...
 * Returns post by preview token (no auth). Used for read-only draft preview links.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { previewToken: token },
      include: { tags: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error("Error fetching preview post:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}
