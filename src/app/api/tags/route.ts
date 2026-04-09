import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";

function publishedPostsSomeFilter(now: Date): Prisma.PostWhereInput {
  return {
    OR: [{ published: true }, { publishedAt: { lte: now } }],
  };
}

/**
 * GET /api/tags
 * Returns tags: by default only those with published posts (for blog filter).
 * ?all=1 returns all tags (dashboard only — requires session).
 */
export async function GET(request: NextRequest) {
  try {
    const all = request.nextUrl.searchParams.get("all") === "1";
    if (all) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const now = new Date();
    const tags = await prisma.tag.findMany({
      where: all ? undefined : { posts: { some: publishedPostsSomeFilter(now) } },
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
