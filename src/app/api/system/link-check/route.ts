import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { auditInternalMarkdownLinks } from "@/lib/link-audit";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const LINK_CHECK_RESOURCE_TYPE = "link_audit";
const LINK_CHECK_ACTION = "system.link_check.scan";

function toScanHistoryEntry(row: { id: string; createdAt: Date; details: string | null }) {
  let parsed: Record<string, unknown> = {};
  if (row.details) {
    try {
      parsed = JSON.parse(row.details) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    scannedDocuments: typeof parsed.scannedDocuments === "number" ? parsed.scannedDocuments : 0,
    scannedLinks: typeof parsed.scannedLinks === "number" ? parsed.scannedLinks : 0,
    brokenCount: typeof parsed.brokenCount === "number" ? parsed.brokenCount : 0,
  };
}

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        action: LINK_CHECK_ACTION,
        resourceType: LINK_CHECK_RESOURCE_TYPE,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        details: true,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        history: rows.map(toScanHistoryEntry),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[system/link-check]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to run link check.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const report = await auditInternalMarkdownLinks();
    await auditLog({
      action: LINK_CHECK_ACTION,
      resourceType: LINK_CHECK_RESOURCE_TYPE,
      resourceId: "system",
      ip: request.headers.get("x-forwarded-for") ?? null,
      details: JSON.stringify({
        scannedDocuments: report.scannedDocuments,
        scannedLinks: report.scannedLinks,
        brokenCount: report.brokenLinks.length,
      }),
    });

    return NextResponse.json(
      {
        ok: true,
        scannedDocuments: report.scannedDocuments,
        scannedLinks: report.scannedLinks,
        brokenCount: report.brokenLinks.length,
        brokenLinks: report.brokenLinks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[system/link-check:post]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to run link check.",
      },
      { status: 500 }
    );
  }
}
