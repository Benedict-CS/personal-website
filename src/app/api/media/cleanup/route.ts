import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listS3Objects, deleteFromS3 } from "@/lib/s3";

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

    // 1. 從資料庫查詢所有文章的 content
    const posts = await prisma.post.findMany({
      select: {
        content: true,
      },
    });

    // 合併所有文章的內容
    const allContent = posts.map((post) => post.content).join("\n");

    // 2. 從 RustFS (S3) 取得所有檔案列表
    const objects = await listS3Objects();
    const files = objects.filter((obj) => obj.Key).map((obj) => obj.Key!);

    // 3. 比對：檢查每個檔案是否被引用
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const fileName of files) {
      // 檢查檔名是否出現在任何文章的內容中
      // 使用 includes 檢查，因為 Markdown 中可能會有 `/api/media/serve/filename` 或 `filename` 等格式
      const isReferenced =
        allContent.includes(fileName) ||
        allContent.includes(`/api/media/serve/${fileName}`) ||
        allContent.includes(`api/media/serve/${fileName}`);

      if (!isReferenced) {
        // 4. 如果沒有被引用，則從 RustFS 刪除
        try {
          await deleteFromS3(fileName);
          deletedFiles.push(fileName);
        } catch (error) {
          console.error(`Error deleting file ${fileName} from RustFS:`, error);
          errors.push(fileName);
        }
      }
    }

    return NextResponse.json({
      deletedCount: deletedFiles.length,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error cleaning up media files:", error);
    return NextResponse.json(
      { error: "Failed to clean up media files" },
      { status: 500 }
    );
  }
}
