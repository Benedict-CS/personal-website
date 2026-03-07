import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List all versions for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id } = await params;

    // Fetch versions, newest first
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
      // Table may not exist yet
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
