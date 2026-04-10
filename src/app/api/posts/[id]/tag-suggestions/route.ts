import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestTags } from "@/lib/auto-tag-suggest";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Post id is required." }, { status: 400 });
  }

  const [post, existingTags] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      select: {
        title: true,
        content: true,
        tags: { select: { name: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
      take: 500,
    }),
  ]);

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const currentTagCsv = post.tags.map((tag) => tag.name).join(", ");
  const suggestions = suggestTags(
    post.title,
    post.content,
    existingTags,
    currentTagCsv,
    8
  );

  return NextResponse.json({
    suggestions,
    existingTagCount: existingTags.length,
  });
}
