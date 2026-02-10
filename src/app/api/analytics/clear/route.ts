import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * POST /api/analytics/clear
 * Clear PageView history. Auth required.
 *
 * Body (JSON):
 * - before: "YYYY-MM-DD" — delete all records before this date (keep recent)
 * - after: "YYYY-MM-DD"  — delete all records after this date (keep old)
 * - confirmAll: true      — required to delete ALL records (no date filter)
 *
 * Returns { deleted: number }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { before?: string; after?: string; confirmAll?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Use before, after (YYYY-MM-DD), or confirmAll: true" },
      { status: 400 }
    );
  }

  const where: Prisma.PageViewWhereInput = {};

  if (body.before) {
    const beforeDate = new Date(body.before + "T00:00:00");
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ error: "Invalid before date (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { lt: beforeDate };
  } else if (body.after) {
    const afterDate = new Date(body.after + "T23:59:59.999");
    if (isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "Invalid after date (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { gt: afterDate };
  } else if (body.confirmAll === true) {
    // delete all — no extra filter
  } else {
    return NextResponse.json(
      {
        error:
          "Provide one of: before (YYYY-MM-DD) to delete older records, after (YYYY-MM-DD), or confirmAll: true to delete all.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.pageView.deleteMany({ where });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    console.error("Analytics clear error:", e);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
