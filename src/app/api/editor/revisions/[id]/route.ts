import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const { id } = await params;
  const row = await prisma.auditLog.findUnique({ where: { id } });
  if (!row || row.resourceType !== "editor_page") {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = row.details ? (JSON.parse(row.details) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  return NextResponse.json({
    id: row.id,
    slug: row.resourceId,
    mode: row.action === "editor.publish" ? "publish" : "draft",
    createdAt: row.createdAt,
    snapshot: parsed.snapshot ?? null,
    actor: parsed.actor ?? null,
  });
}

