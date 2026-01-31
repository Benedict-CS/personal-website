import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags
 * Returns tags that have at least one published post (for blog filter UI).
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      where: {
        posts: {
          some: { published: true },
        },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
