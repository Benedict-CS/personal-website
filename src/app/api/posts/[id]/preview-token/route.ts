import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * POST /api/posts/[id]/preview-token
 * Generate or rotate preview token for draft sharing (auth required).
 * Returns { previewUrl }.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id } = await params;
    const token = randomBytes(32).toString("hex");

    await prisma.post.update({
      where: { id },
      data: { previewToken: token },
    });

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const previewUrl = `${base}/blog/preview?token=${token}`;

    return NextResponse.json({ previewUrl, token }, { status: 200 });
  } catch (error) {
    console.error("Error generating preview token:", error);
    return NextResponse.json(
      { error: "Failed to generate preview link" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/preview-token
 * Revoke preview token (auth required).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const { id } = await params;

    await prisma.post.update({
      where: { id },
      data: { previewToken: null },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error revoking preview token:", error);
    return NextResponse.json(
      { error: "Failed to revoke preview link" },
      { status: 500 }
    );
  }
}
