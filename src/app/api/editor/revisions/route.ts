import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

type RevisionMode = "draft" | "publish";

function parseDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const slug = (request.nextUrl.searchParams.get("slug") ?? "").trim();
  const limit = Math.min(Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10)), 100);
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const rows = await prisma.auditLog.findMany({
    where: {
      resourceType: "editor_page",
      resourceId: slug,
      action: { in: ["editor.draft.save", "editor.publish"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const revisions = rows.map((row) => {
    const parsed = parseDetails(row.details);
    return {
      id: row.id,
      slug: row.resourceId,
      mode: row.action === "editor.publish" ? "publish" : "draft",
      createdAt: row.createdAt,
      actor: typeof parsed.actor === "string" ? parsed.actor : null,
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
    };
  });

  return NextResponse.json(revisions);
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const body = await request.json().catch(() => null);
  const slug = String(body?.slug ?? "").trim();
  const mode = String(body?.mode ?? "draft").trim() as RevisionMode;
  const snapshot = body?.snapshot;

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (mode !== "draft" && mode !== "publish") {
    return NextResponse.json({ error: "mode must be draft or publish" }, { status: 400 });
  }
  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json({ error: "snapshot object is required" }, { status: 400 });
  }

  const detailsObject = {
    mode,
    actor: auth.session.user?.email ?? auth.session.user?.name ?? "unknown",
    summary: `${mode === "publish" ? "Published" : "Saved draft"} ${slug}`,
    snapshot,
  };
  const detailsJson = JSON.stringify(detailsObject);
  if (detailsJson.length > 400_000) {
    return NextResponse.json({ error: "snapshot is too large" }, { status: 413 });
  }

  const created = await auditLog({
    action: mode === "publish" ? "editor.publish" : "editor.draft.save",
    resourceType: "editor_page",
    resourceId: slug,
    details: detailsJson,
    ip: request.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json({
    ok: true,
    revision: {
      id: created?.id ?? null,
      slug: created?.resourceId ?? slug,
      mode,
      createdAt: created?.createdAt ?? new Date().toISOString(),
      details: detailsObject,
    },
  });
}

