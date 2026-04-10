import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withPublicationState } from "@/lib/post-publication-state";

function revalidateBulkPostSurfaces(slugs: string[], tagSlugs: string[]) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/blog/archive");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidateTag("posts", "max");
  for (const slug of slugs) {
    revalidatePath(`/blog/${slug}`);
    revalidateTag(`post:${slug}`, "max");
  }
  for (const tag of tagSlugs) {
    revalidatePath(`/blog/tag/${tag}`);
    revalidateTag(`tag:${tag}`, "max");
  }
}

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
    const targetPosts = await prisma.post.findMany({
      where: { id: { in: validIds } },
      include: { tags: true },
    });
    if (targetPosts.length === 0) {
      return NextResponse.json({ updated: 0, action });
    }
    const targetIds = targetPosts.map((post) => post.id);

    if (action === "delete") {
      const result = await prisma.$transaction(async (tx) => {
        const deleted = await tx.post.deleteMany({
          where: { id: { in: targetIds } },
        });
        return deleted.count;
      });
      revalidateBulkPostSurfaces(
        targetPosts.map((post) => post.slug),
        targetPosts.flatMap((post) => post.tags.map((tag) => tag.slug))
      );
      return NextResponse.json({ updated: result, action: "delete" });
    }

    if (action === "publish" || action === "unpublish") {
      const published = action === "publish";
      const updatedPosts = await prisma.$transaction(async (tx) => {
        await tx.post.updateMany({
          where: { id: { in: targetIds } },
          data: { published, publishedAt: published ? new Date() : null },
        });
        return tx.post.findMany({
          where: { id: { in: targetIds } },
          include: { tags: true },
        });
      });
      revalidateBulkPostSurfaces(
        updatedPosts.map((post) => post.slug),
        updatedPosts.flatMap((post) => post.tags.map((tag) => tag.slug))
      );
      return NextResponse.json({
        updated: updatedPosts.length,
        action,
        posts: updatedPosts.map((post) => withPublicationState(post)),
      });
    }

    if (action === "update") {
      const { category, tags: tagsInput, published } = body;
      const tagNames = parseTagNames(tagsInput);
      const data: { category?: string | null; published?: boolean } = {};
      if (category !== undefined) data.category = category === "" ? null : category;
      if (published !== undefined) data.published = published;

      const updatedPosts = await prisma.$transaction(async (tx) => {
        if (Object.keys(data).length > 0) {
          await tx.post.updateMany({
            where: { id: { in: targetIds } },
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
            const tag = await tx.tag.upsert({
              where: { slug },
              create: { name, slug },
              update: {},
              select: { id: true },
            });
            tagIds.push(tag.id);
          }
          for (const postId of targetIds) {
            await tx.post.update({
              where: { id: postId },
              data: { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } },
            });
          }
        }

        return tx.post.findMany({
          where: { id: { in: targetIds } },
          include: { tags: true },
        });
      });

      revalidateBulkPostSurfaces(
        updatedPosts.map((post) => post.slug),
        updatedPosts.flatMap((post) => post.tags.map((tag) => tag.slug))
      );
      return NextResponse.json({
        updated: updatedPosts.length,
        action: "update",
        posts: updatedPosts.map((post) => withPublicationState(post)),
      });
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
