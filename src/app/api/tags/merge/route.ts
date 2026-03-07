import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tags/merge — merge tag A into B: reassign all posts from A to B, then delete A.
 * Body: { fromTagId: string, toTagId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const body = await request.json();
    const fromTagId = body.fromTagId as string | undefined;
    const toTagId = body.toTagId as string | undefined;
    if (!fromTagId || !toTagId || fromTagId === toTagId) {
      return NextResponse.json(
        { error: "fromTagId and toTagId required and must differ" },
        { status: 400 }
      );
    }

    const [fromTag, toTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id: fromTagId }, include: { posts: true } }),
      prisma.tag.findUnique({ where: { id: toTagId } }),
    ]);
    if (!fromTag || !toTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const postIds = fromTag.posts.map((p) => p.id);
    if (postIds.length > 0) {
      await prisma.$transaction(
        postIds.map((postId) =>
          prisma.post.update({
            where: { id: postId },
            data: {
              tags: {
                disconnect: { id: fromTagId },
                connect: { id: toTagId },
              },
            },
          })
        )
      );
    }

    await prisma.tag.delete({ where: { id: fromTagId } });
    return NextResponse.json({
      ok: true,
      message: `Merged "${fromTag.name}" into "${toTag.name}" (${postIds.length} posts).`,
    });
  } catch (error) {
    console.error("Tag merge error:", error);
    return NextResponse.json(
      { error: "Failed to merge tags" },
      { status: 500 }
    );
  }
}
