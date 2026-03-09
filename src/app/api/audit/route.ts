import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/audit — list recent audit log entries (auth required).
 * Query: ?limit=50 (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const limit = Math.min(Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)), 200);
  const resourceType = (request.nextUrl.searchParams.get("resourceType") ?? "").trim();
  const action = (request.nextUrl.searchParams.get("action") ?? "").trim();

  const entries = await prisma.auditLog.findMany({
    where: {
      ...(resourceType ? { resourceType } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const enriched = entries.map((entry) => {
    let actor: string | null = null;
    let parsedDetails: unknown = entry.details;
    try {
      if (entry.details) {
        const obj = JSON.parse(entry.details) as Record<string, unknown>;
        parsedDetails = obj;
        actor =
          (typeof obj.actor === "string" && obj.actor) ||
          (typeof obj.user === "string" && obj.user) ||
          null;
      }
    } catch {
      parsedDetails = entry.details;
    }
    return { ...entry, actor, details: parsedDetails };
  });

  return NextResponse.json(enriched);
}
