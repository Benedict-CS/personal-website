import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInternalLinkSuggestions } from "@/lib/internal-link-suggestions";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Post id is required." }, { status: 400 });
  }

  const current = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      tags: { select: { name: true } },
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const candidates = await prisma.post.findMany({
    where: { id: { not: id } },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      tags: { select: { name: true } },
    },
    take: 120,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  const suggestions = buildInternalLinkSuggestions({
    currentTitle: current.title,
    currentContent: current.content,
    currentTags: current.tags.map((t) => t.name),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      slug: candidate.slug,
      title: candidate.title,
      content: candidate.content,
      tags: candidate.tags.map((t) => t.name),
    })),
    limit: 8,
  });

  return NextResponse.json({
    suggestions,
    scannedCandidates: candidates.length,
  });
}
