import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    return NextResponse.json(post, { status: 200 });
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
    const { id } = await params;

    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 解析 request body
    const body = await request.json();
    const { title, slug, content, description, published, pinned, tags, createdAt, category } = body;

    // 先取得當前文章內容
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

    // 如果只是更新 category（快速編輯），直接更新並返回
    if (category !== undefined && !title && !slug && !content) {
      // @ts-ignore
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          // @ts-ignore
          category: category,
        },
        include: {
          tags: true,
        },
      });
      return NextResponse.json(updatedPost, { status: 200 });
    }

    // 驗證必要欄位（正常更新時）
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, content" },
        { status: 400 }
      );
    }

    // 處理 tags：將逗號分隔的字串轉換為 connectOrCreate 陣列
    const tagConnections = tags
      ? tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
          .map((tagName: string) => {
            // 去除標籤名稱前後的引號（單引號和雙引號）
            let cleanedTagName = tagName.trim();
            // 去除開頭的引號
            cleanedTagName = cleanedTagName.replace(/^["']+/, "");
            // 去除結尾的引號
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
          })
      : [];

    // 檢查是否有實際變更（標題、內容、slug、published 或標籤）
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

    // 如果有變更，先保存當前版本（如果版本控制表存在）
    if (hasChanges) {
      try {
        // 取得當前最大版本號
        const maxVersion = await prisma.postVersion.findFirst({
          where: { postId: id },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });

        const nextVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;

        // 保存版本
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

        // 限制版本數量：只保留最近 20 個版本
        const allVersions = await prisma.postVersion.findMany({
          where: { postId: id },
          orderBy: { versionNumber: "desc" },
          select: { id: true, versionNumber: true },
        });

        if (allVersions.length > 20) {
          // 刪除超過 20 個的舊版本
          const versionsToDelete = allVersions.slice(20);
          const idsToDelete = versionsToDelete.map((v) => v.id);
          
          await prisma.postVersion.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });
        }
      } catch (versionError: unknown) {
        // 如果版本控制表不存在，只記錄錯誤但不影響文章更新
        // 這允許在 migration 執行前仍能正常更新文章
        const err = versionError as { code?: string; message?: string };
        if (err.code === "P2021" || err.message?.includes("does not exist")) {
          console.warn("PostVersion table does not exist. Run migration to enable version control.");
        } else {
          console.error("Error saving post version:", versionError);
        }
      }
    }

    // 更新文章（包含 createdAt, description, category）
    // @ts-ignore - description and category fields added via migration
    const post = await prisma.post.update({
      where: {
        id: id,
      },
      data: {
        title,
        slug,
        content,
        // @ts-ignore
        description: description !== undefined ? description : undefined,
        published: published ?? false,
        pinned: pinned ?? false,
        // @ts-ignore
        category: category !== undefined ? category : undefined,
        ...(createdAt && { createdAt: new Date(createdAt) }),
        tags: {
          set: [],
          connectOrCreate: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(post, { status: 200 });
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

    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 刪除文章
    await prisma.post.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
