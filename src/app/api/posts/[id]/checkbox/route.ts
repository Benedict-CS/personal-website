import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggle checkbox in markdown content
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

    const body = await request.json();
    const { checkboxIndex, checked } = body;

    if (typeof checkboxIndex !== "number") {
      return NextResponse.json(
        { error: "checkboxIndex is required" },
        { status: 400 }
      );
    }

    // 取得文章
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 找到所有 checkbox（包含表格內和列表的）
    const checkboxRegex = /\[([xX ])\]/g;
    let matches = 0;
    let updatedContent = post.content;

    updatedContent = post.content.replace(checkboxRegex, (match, checkMark) => {
      if (matches === checkboxIndex) {
        // 找到目標 checkbox，toggle 狀態
        matches++;
        return checked ? "[x]" : "[ ]";
      }
      matches++;
      return match;
    });

    // 更新文章（不創建版本，checkbox toggle 不算內容變更）
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        content: updatedContent,
      },
    });

    return NextResponse.json({ success: true, content: updatedPost.content }, { status: 200 });
  } catch (error) {
    console.error("Error toggling checkbox:", error);
    return NextResponse.json(
      { error: "Failed to toggle checkbox" },
      { status: 500 }
    );
  }
}
