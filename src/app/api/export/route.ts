import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/export — export all posts and custom pages as JSON (auth required).
 */
export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const [posts, pages] = await Promise.all([
      prisma.post.findMany({
        orderBy: { createdAt: "asc" },
        include: { tags: true },
      }),
      prisma.customPage.findMany({ orderBy: { order: "asc" } }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content,
        description: p.description,
        published: p.published,
        pinned: p.pinned,
        category: p.category,
        order: p.order,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        tags: p.tags.map((t) => t.name),
      })),
      customPages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: p.content,
        order: p.order,
        published: p.published,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
