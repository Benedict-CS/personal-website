import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  try {
    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 取得所有標籤
    const allTags = await prisma.tag.findMany();

    const cleanedTags: Array<{ id: string; oldName: string; newName: string }> = [];
    const errors: string[] = [];

    for (const tag of allTags) {
      // 檢查標籤名稱是否包含引號
      // 去除開頭和結尾的引號（單引號 ' 和雙引號 "）
      let cleanedName = tag.name.trim();
      // 去除開頭的引號
      cleanedName = cleanedName.replace(/^["']+/, "");
      // 去除結尾的引號
      cleanedName = cleanedName.replace(/["']+$/, "");
      
      if (cleanedName !== tag.name) {
        try {
          // 計算新的 slug
          const newSlug = cleanedName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");

          // 檢查新 slug 是否已存在（可能是另一個標籤）
          const existingTag = await prisma.tag.findUnique({
            where: { slug: newSlug },
          });

          if (existingTag && existingTag.id !== tag.id) {
            // 如果新 slug 已存在且是不同的標籤，需要合併
            // 先將所有使用舊標籤的文章連接到新標籤
            const postsWithOldTag = await prisma.post.findMany({
              where: {
                tags: {
                  some: {
                    id: tag.id,
                  },
                },
              },
            });

            // 更新所有文章，將舊標籤替換為新標籤
            for (const post of postsWithOldTag) {
              await prisma.post.update({
                where: { id: post.id },
                data: {
                  tags: {
                    disconnect: { id: tag.id },
                    connect: { id: existingTag.id },
                  },
                },
              });
            }

            // 刪除舊標籤
            await prisma.tag.delete({
              where: { id: tag.id },
            });

            cleanedTags.push({
              id: tag.id,
              oldName: tag.name,
              newName: existingTag.name, // 使用已存在標籤的名稱
            });
          } else {
            // 更新標籤名稱和 slug
            await prisma.tag.update({
              where: { id: tag.id },
              data: {
                name: cleanedName,
                slug: newSlug,
              },
            });

            cleanedTags.push({
              id: tag.id,
              oldName: tag.name,
              newName: cleanedName,
            });
          }
        } catch (error) {
          console.error(`Error cleaning tag ${tag.id}:`, error);
          errors.push(tag.name);
        }
      }
    }

    return NextResponse.json({
      cleanedCount: cleanedTags.length,
      cleanedTags,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully cleaned ${cleanedTags.length} tag(s)`,
    });
  } catch (error) {
    console.error("Error cleaning up tags:", error);
    return NextResponse.json(
      { error: "Failed to clean up tags" },
      { status: 500 }
    );
  }
}
