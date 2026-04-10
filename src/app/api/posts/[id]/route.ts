import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { normalizePublicationInput, withPublicationState } from "@/lib/post-publication-state";

function parseTagConnections(tags: string | undefined) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0)
    .map((tagName: string) => {
      let cleanedTagName = tagName.trim();
      cleanedTagName = cleanedTagName.replace(/^["']+/, "");
      cleanedTagName = cleanedTagName.replace(/["']+$/, "");
      const tagSlug = cleanedTagName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return {
        where: { slug: tagSlug },
        create: { name: cleanedTagName, slug: tagSlug },
      };
    });
}

function revalidatePublicPostSurfaces(slug: string, tagSlugs: string[]) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/blog/archive");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidateTag("posts", "max");
  revalidateTag(`post:${slug}`, "max");
  for (const tagSlug of tagSlugs) {
    revalidatePath(`/blog/tag/${tagSlug}`);
    revalidateTag(`tag:${tagSlug}`, "max");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const post = await prisma.post.findUnique({
      where: {
        id: id,
      },
      include: {
        tags: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(withPublicationState(post), { status: 200 });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;
    const ip = getClientIP(request);
    const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "posts_write");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many post updates. Please try again in a minute." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
            "Cache-Control": "no-store, private",
          },
        }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { title, slug, content, description, published, pinned, tags, createdAt, category, autosave, publishedAt } = body;

    // Get current post content
    const currentPost = await prisma.post.findUnique({
      where: { id: id },
      include: { tags: true },
    });

    if (!currentPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // If only updating category (quick edit), update and return
    if (category !== undefined && !title && !slug && !content) {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          category: category,
        },
        include: {
          tags: true,
        },
      });
      revalidatePublicPostSurfaces(
        updatedPost.slug,
        updatedPost.tags.map((tag) => tag.slug)
      );
      return NextResponse.json(withPublicationState(updatedPost), { status: 200 });
    }

    // If only updating content (inline quick edit or autosave)
    if (content !== undefined && !title && !slug) {
      const updatedPost = await prisma.$transaction(async (tx) => {
        if (currentPost.content !== content && !autosave) {
          const maxVersion = await tx.postVersion.findFirst({
            where: { postId: id },
            orderBy: { versionNumber: "desc" },
            select: { versionNumber: true },
          });
          const nextVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;
          await tx.postVersion.create({
            data: {
              postId: id,
              title: currentPost.title,
              slug: currentPost.slug,
              content: currentPost.content,
              published: currentPost.published,
              tags: JSON.stringify(currentPost.tags.map((t: { name: string }) => t.name).sort()),
              versionNumber: nextVersionNumber,
            },
          });
          const allVersions = await tx.postVersion.findMany({
            where: { postId: id },
            orderBy: { versionNumber: "desc" },
            select: { id: true, versionNumber: true },
          });
          if (allVersions.length > 20) {
            await tx.postVersion.deleteMany({
              where: { id: { in: allVersions.slice(20).map((v) => v.id) } },
            });
          }
        }
        return tx.post.update({
          where: { id },
          data: { content },
          include: { tags: true },
        });
      });
      revalidatePublicPostSurfaces(
        updatedPost.slug,
        updatedPost.tags.map((tag) => tag.slug)
      );
      return NextResponse.json(withPublicationState(updatedPost), { status: 200 });
    }

    // Validate required fields for full update
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, content" },
        { status: 400 }
      );
    }

    // Process tags: convert comma-separated string to connectOrCreate array
    const tagConnections = parseTagConnections(tags);

    // Check if there are actual changes (title, content, slug, published, or tags)
    const currentTagsJson = JSON.stringify(
      currentPost.tags.map((t: { name: string }) => t.name).sort()
    );
    const newTagsArray = tags
      ? tags
          .split(",")
          .map((tag: string) => {
            let cleaned = tag.trim();
            cleaned = cleaned.replace(/^["']+/, "");
            cleaned = cleaned.replace(/["']+$/, "");
            return cleaned;
          })
          .filter((t: string) => t.length > 0)
          .sort()
      : [];
    const newTagsJson = JSON.stringify(newTagsArray);

    const hasChanges =
      currentPost.title !== title ||
      currentPost.content !== content ||
      currentPost.slug !== slug ||
      currentPost.published !== (published ?? false) ||
      currentTagsJson !== newTagsJson;

    const normalizedPublication = normalizePublicationInput({
      published: typeof published === "boolean" ? published : false,
      publishedAt:
        publishedAt !== undefined && publishedAt !== null && String(publishedAt).trim() !== ""
          ? String(publishedAt)
          : null,
    });

    const post = await prisma.$transaction(async (tx) => {
      if (hasChanges && !autosave) {
        const maxVersion = await tx.postVersion.findFirst({
          where: { postId: id },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        const nextVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;
        await tx.postVersion.create({
          data: {
            postId: id,
            title: currentPost.title,
            slug: currentPost.slug,
            content: currentPost.content,
            published: currentPost.published,
            tags: currentTagsJson,
            versionNumber: nextVersionNumber,
          },
        });
        const allVersions = await tx.postVersion.findMany({
          where: { postId: id },
          orderBy: { versionNumber: "desc" },
          select: { id: true, versionNumber: true },
        });
        if (allVersions.length > 20) {
          await tx.postVersion.deleteMany({
            where: { id: { in: allVersions.slice(20).map((v) => v.id) } },
          });
        }
      }

      return tx.post.update({
        where: { id },
        data: {
          title,
          slug,
          content,
          description: description !== undefined ? description : undefined,
          published: normalizedPublication.published,
          pinned: pinned ?? false,
          category: category !== undefined ? category : undefined,
          ...(createdAt && { createdAt: new Date(createdAt) }),
          publishedAt: normalizedPublication.publishedAt,
          tags: {
            set: [],
            connectOrCreate: tagConnections,
          },
        },
        include: { tags: true },
      });
    });

    revalidatePublicPostSurfaces(
      post.slug,
      Array.from(new Set([...currentPost.tags.map((tag) => tag.slug), ...post.tags.map((tag) => tag.slug)]))
    );
    await auditLog({
      action: "post.update",
      resourceType: "post",
      resourceId: post.id,
      details: post.slug,
      ip,
    });
    return NextResponse.json(withPublicationState(post), {
      status: 200,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;
    const ip = getClientIP(request);
    const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "posts_write");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many post updates. Please try again in a minute." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
            "Cache-Control": "no-store, private",
          },
        }
      );
    }

    const existing = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
    await prisma.post.delete({
      where: { id },
    });
    if (existing) {
      revalidatePublicPostSurfaces(existing.slug, []);
    }
    await auditLog({
      action: "post.delete",
      resourceType: "post",
      resourceId: id,
      details: existing?.slug ?? undefined,
      ip,
    });
    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
