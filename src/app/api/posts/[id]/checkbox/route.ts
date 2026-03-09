import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggle checkbox in markdown content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id } = await params;
    const body = await request.json();
    const { checkboxIndex, checked } = body;

    if (typeof checkboxIndex !== "number") {
      return NextResponse.json(
        { error: "checkboxIndex is required" },
        { status: 400 }
      );
    }

    // Fetch post
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Find all checkboxes (tables and lists)
    const checkboxRegex = /\[(?:[xX ])\]/g;
    let matches = 0;
    let updatedContent = post.content;

    updatedContent = post.content.replace(checkboxRegex, (match) => {
      if (matches === checkboxIndex) {
        // Toggle target checkbox
        matches++;
        return checked ? "[x]" : "[ ]";
      }
      matches++;
      return match;
    });

    // Update post (no version; checkbox toggle is not content change)
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
