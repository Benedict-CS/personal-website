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
 * - cleanupTagPrefetchNoise: true
 *   optionally with onDate to scope cleanup to one day (recommended)
 * - confirmAll: true      — delete ALL records (no filter)
 *
 * Returns { deleted: number, accessBlockDeleted: number }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  let body: {
    ip?: string;
    before?: string;
    after?: string;
    onDate?: string;
    cleanupTagPrefetchNoise?: boolean;
    confirmAll?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON body. Use ip, before, after, onDate (YYYY-MM-DD), cleanupTagPrefetchNoise: true, or confirmAll: true",
      },
      { status: 400 }
    );
  }

  if (body.cleanupTagPrefetchNoise === true) {
    const dateFilter: Prisma.DateTimeFilter | undefined = body.onDate
      ? (() => {
          const start = new Date(body.onDate + "T00:00:00");
          const end = new Date(body.onDate + "T23:59:59.999");
          if (isNaN(start.getTime())) return undefined;
          return { gte: start, lte: end };
        })()
      : undefined;
    if (body.onDate && !dateFilter) {
      return NextResponse.json({ error: "Invalid onDate (use YYYY-MM-DD)" }, { status: 400 });
    }

    try {
      // Heuristic for accidental prefetch storms:
      // many /blog/tag/* rows from one IP with no leave-duration signal.
      const groups = await prisma.pageView.groupBy({
        by: ["ip"],
        where: {
          path: { startsWith: "/blog/tag/" },
          durationSeconds: null,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        _count: { _all: true },
      });
      const suspiciousIps = groups.filter((g) => g._count._all >= 10).map((g) => g.ip);
      if (suspiciousIps.length === 0) {
        return NextResponse.json({
          deleted: 0,
          accessBlockDeleted: 0,
          suspiciousIpCount: 0,
          scopedDate: body.onDate || null,
        });
      }

      const pv = await prisma.pageView.deleteMany({
        where: {
          ip: { in: suspiciousIps },
          path: { startsWith: "/blog/tag/" },
          durationSeconds: null,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });
      return NextResponse.json({
        deleted: pv.count,
        accessBlockDeleted: 0,
        suspiciousIpCount: suspiciousIps.length,
        scopedDate: body.onDate || null,
      });
    } catch (e) {
      console.error("Analytics targeted cleanup error:", e);
      return NextResponse.json({ error: "Failed to clear targeted noise" }, { status: 500 });
    }
  }

  const where: Prisma.PageViewWhereInput = {};
  const blockWhere: Prisma.AccessBlockLogWhereInput = {};

  if (body.ip != null && body.ip.trim() !== "") {
    const trimmed = body.ip.trim();
    where.ip = trimmed;
    blockWhere.ip = trimmed;
  } else if (body.onDate) {
    const start = new Date(body.onDate + "T00:00:00");
    const end = new Date(body.onDate + "T23:59:59.999");
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid onDate (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { gte: start, lte: end };
    blockWhere.createdAt = { gte: start, lte: end };
  } else if (body.before) {
    const beforeDate = new Date(body.before + "T00:00:00");
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ error: "Invalid before date (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { lt: beforeDate };
    blockWhere.createdAt = { lt: beforeDate };
  } else if (body.after) {
    const afterDate = new Date(body.after + "T23:59:59.999");
    if (isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "Invalid after date (use YYYY-MM-DD)" }, { status: 400 });
    }
    where.createdAt = { gt: afterDate };
    blockWhere.createdAt = { gt: afterDate };
  } else if (body.confirmAll === true) {
    // delete all — no extra filter
  } else {
    return NextResponse.json(
      {
        error:
          "Provide one of: ip, before (YYYY-MM-DD), after (YYYY-MM-DD), onDate (YYYY-MM-DD), cleanupTagPrefetchNoise: true, or confirmAll: true.",
      },
      { status: 400 }
    );
  }

  try {
    const [pv, ab] = await prisma.$transaction([
      prisma.pageView.deleteMany({ where }),
      prisma.accessBlockLog.deleteMany({ where: blockWhere }),
    ]);
    return NextResponse.json({ deleted: pv.count, accessBlockDeleted: ab.count });
  } catch (e) {
    console.error("Analytics clear error:", e);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
