import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Restore post to a given version
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; versionId: string }>;
  }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id, versionId } = await params;

    // Fetch the version to restore
    let version;
    try {
      version = await prisma.postVersion.findUnique({
        where: {
          id: versionId,
          postId: id,
        },
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "P2021" || err.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Version history is not enabled. Run: npx prisma migrate deploy" },
          { status: 503 }
        );
      }
      throw error;
    }

    if (!version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Save current version first if different
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

    const currentTagsJson = JSON.stringify(
      currentPost.tags.map((t) => t.name).sort()
    );

    // Check if there are changes
    const hasChanges =
      currentPost.title !== version.title ||
      currentPost.content !== version.content ||
      currentPost.slug !== version.slug ||
      currentPost.published !== version.published ||
      currentTagsJson !== version.tags;

    if (hasChanges) {
      // Save current version
      const maxVersion = await prisma.postVersion.findFirst({
        where: { postId: id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      const nextVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;

      await prisma.postVersion.create({
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
    }

    // Parse tags from version
    const versionTags = JSON.parse(version.tags) as string[];

    // Connect tags
    const tagConnections = versionTags.map((tagName: string) => {
      const tagSlug = tagName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return {
        where: { slug: tagSlug },
        create: { name: tagName, slug: tagSlug },
      };
    });

    // Restore post to version
    const restoredPost = await prisma.post.update({
      where: {
        id: id,
      },
      data: {
        title: version.title,
        slug: version.slug,
        content: version.content,
        published: version.published,
        tags: {
          set: [],
          connectOrCreate: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(
      {
        message: "Post restored successfully",
        post: restoredPost,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error restoring post version:", error);
    return NextResponse.json(
      { error: "Failed to restore post version" },
      { status: 500 }
    );
  }
}
