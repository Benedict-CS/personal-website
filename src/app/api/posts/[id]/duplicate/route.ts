import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posts/[id]/duplicate
 * Clone post as a new draft (auth required).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id } = await params;
    const source = await prisma.post.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const baseSlug = source.slug + "-copy";
    let slug = baseSlug;
    let n = 0;
    while (true) {
      const exists = await prisma.post.findUnique({ where: { slug } });
      if (!exists) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const created = await prisma.post.create({
      data: {
        title: source.title + " (copy)",
        slug,
        content: source.content,
        description: source.description,
        published: false,
        pinned: false,
        category: source.category,
        order: source.order,
        tags: { connect: source.tags.map((t) => ({ id: t.id })) },
      },
    });

    return NextResponse.json({ id: created.id }, { status: 200 });
  } catch (error) {
    console.error("Error duplicating post:", error);
    return NextResponse.json(
      { error: "Failed to duplicate post" },
      { status: 500 }
    );
  }
}
