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

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(entries);
}
