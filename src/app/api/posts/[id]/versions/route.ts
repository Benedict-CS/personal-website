import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 取得文章的所有版本歷史
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

    // 取得所有版本，按版本號降序排列
    try {
      const versions = await prisma.postVersion.findMany({
        where: {
          postId: id,
        },
        orderBy: {
          versionNumber: "desc",
        },
      });

      return NextResponse.json(versions, { status: 200 });
    } catch (error: unknown) {
      // 如果表不存在，返回空陣列而不是錯誤
      const err = error as { code?: string; message?: string };
      if (err.code === "P2021" || err.message?.includes("does not exist")) {
        console.warn("PostVersion table does not exist. Run migration to enable version control.");
        return NextResponse.json([], { status: 200 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching post versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch post versions" },
      { status: 500 }
    );
  }
}
