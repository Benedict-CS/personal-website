import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 恢復到指定版本
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; versionId: string }>;
  }
) {
  try {
    const { id, versionId } = await params;

    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 取得要恢復的版本
    let version;
    try {
      version = await prisma.postVersion.findUnique({
        where: {
          id: versionId,
          postId: id, // 確保版本屬於該文章
        },
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "P2021" || err.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "版本控制功能尚未啟用。請先執行資料庫遷移：npx prisma migrate deploy" },
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

    // 先保存當前版本（如果與要恢復的版本不同）
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

    // 檢查是否有變更
    const hasChanges =
      currentPost.title !== version.title ||
      currentPost.content !== version.content ||
      currentPost.slug !== version.slug ||
      currentPost.published !== version.published ||
      currentTagsJson !== version.tags;

    if (hasChanges) {
      // 保存當前版本
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

    // 解析版本中的標籤
    const versionTags = JSON.parse(version.tags) as string[];

    // 處理標籤連接
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

    // 恢復文章到指定版本
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
