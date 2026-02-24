import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  let body: {
    action: string;
    ids?: string[];
    category?: string | null;
    tags?: string[] | string | null;
    published?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Use { action: 'publish'|'unpublish'|'delete'|'update', ids: string[], and for update: category?, tags?, published? }" },
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

  function parseTagNames(tagsInput: string[] | string | null | undefined): string[] {
    if (tagsInput == null) return [];
    const arr = Array.isArray(tagsInput) ? tagsInput : tagsInput.split(",").map((s) => s.trim());
    return arr
      .filter((s) => s.length > 0)
      .map((tagName: string) =>
        tagName.replace(/^["']+/, "").replace(/["']+$/, "").trim()
      )
      .filter(Boolean);
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

    if (action === "update") {
      const { category, tags: tagsInput, published } = body;
      const tagNames = parseTagNames(tagsInput);
      const data: { category?: string | null; published?: boolean } = {};
      if (category !== undefined) data.category = category === "" ? null : category;
      if (published !== undefined) data.published = published;

      if (Object.keys(data).length > 0) {
        await prisma.post.updateMany({
          where: { id: { in: validIds } },
          data,
        });
      }

      if (tagNames.length > 0) {
        const tagSlugs = tagNames.map((name) => ({
          name,
          slug: name
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, ""),
        }));
        const tagIds: string[] = [];
        for (const { name, slug } of tagSlugs) {
          const tag = await prisma.tag.upsert({
            where: { slug },
            create: { name, slug },
            update: {},
            select: { id: true },
          });
          tagIds.push(tag.id);
        }
        for (const id of validIds) {
          await prisma.post.update({
            where: { id },
            data: { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } },
          });
        }
      }

      return NextResponse.json({ updated: validIds.length, action: "update" });
    }

    return NextResponse.json(
      { error: "action must be publish, unpublish, delete, or update" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Posts bulk error:", e);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
