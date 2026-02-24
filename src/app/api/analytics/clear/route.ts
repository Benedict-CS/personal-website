import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * POST /api/analytics/clear
 * Clear PageView history. Auth required.
 *
 * Body (JSON), one of:
 * - ip: "x.x.x.x"         — delete all records for this IP
 * - before: "YYYY-MM-DD" — delete all records before this date
 * - after: "YYYY-MM-DD"  — delete all records after this date
 * - onDate: "YYYY-MM-DD" — delete all records on this calendar day
 * - confirmAll: true      — delete ALL records (no filter)
 *
 * Returns { deleted: number }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  let body: { ip?: string; before?: string; after?: string; onDate?: string; confirmAll?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Use ip, before, after, onDate (YYYY-MM-DD), or confirmAll: true" },
      { status: 400 }
    );
  }

  const where: Prisma.PageViewWhereInput = {};

  if (body.ip != null && body.ip.trim() !== "") {
    where.ip = body.ip.trim();
  } else if (body.onDate) {
    const start = new Date(body.onDate + "T00:00:00");
    const end = new Date(body.onDate + "T23:59:59.999");
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid onDate (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { gte: start, lte: end };
  } else if (body.before) {
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
          "Provide one of: ip, before (YYYY-MM-DD), after (YYYY-MM-DD), onDate (YYYY-MM-DD), or confirmAll: true.",
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
