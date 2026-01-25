import { NextResponse } from "next/server";
import { listS3Objects } from "@/lib/s3";

export async function GET() {
  try {
    // 從 RustFS (S3) 列出所有檔案
    const objects = await listS3Objects();

    // 轉換為 API 格式
    const fileList = objects
      .filter((obj) => obj.Key) // 過濾掉沒有 Key 的物件
      .map((obj) => ({
        name: obj.Key!,
        size: obj.Size || 0,
        createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
        url: `/api/media/serve/${obj.Key}`,
      }));

    // 按建立時間排序（最新的在前）
    fileList.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(fileList);
  } catch (error) {
    console.error("Error fetching media files:", error);
    return NextResponse.json(
      { error: "Failed to fetch media files" },
      { status: 500 }
    );
  }
}
