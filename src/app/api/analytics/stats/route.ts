import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getExcludedIPsForNotIn, getExcludedIPsSet, getExcludedPrefixes, filterByExcludedIP } from "@/lib/analytics-excluded-ips";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const filterIP = request.nextUrl.searchParams.get("ip")?.trim() || null;
  let fromDate: Date | null = null;
  let toDate: Date | null = null;
  if (from) {
    fromDate = new Date(from + "T00:00:00");
    if (isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: "Invalid from" }, { status: 400 });
    }
  }
  if (to) {
    toDate = new Date(to + "T23:59:59.999");
    if (isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid to" }, { status: 400 });
    }
  }

  const excludedForNotIn = getExcludedIPsForNotIn();
  const excludedSet = getExcludedIPsSet();
  const excludedPrefixes = getExcludedPrefixes();

  const where: Prisma.PageViewWhereInput = {};
  if (filterIP) {
    where.ip = filterIP;
  } else {
    const andParts: Prisma.PageViewWhereInput[] = [];
    if (excludedForNotIn.length > 0) andParts.push({ ip: { notIn: excludedForNotIn } });
    excludedPrefixes.forEach((p) => andParts.push({ ip: { not: { startsWith: p } } }));
    if (andParts.length === 1) Object.assign(where, andParts[0]);
    else if (andParts.length > 1) where.AND = andParts;
  }
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;
  if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

  try {
    const [total, byPath, byIP, byCountry, withDuration, recent] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.groupBy({
        by: ["path"],
        where,
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 50,
      }),
      prisma.pageView.groupBy({
        by: ["ip"],
        where,
        _count: { ip: true },
        orderBy: { _count: { ip: "desc" } },
        take: 50,
      }),
      prisma.pageView.groupBy({
        by: ["country"],
        where: { ...where, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 30,
      }),
      prisma.pageView.aggregate({
        where: { ...where, durationSeconds: { not: null } },
        _avg: { durationSeconds: true },
        _count: { durationSeconds: true },
      }),
      prisma.pageView.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { path: true, ip: true, country: true, city: true, durationSeconds: true, createdAt: true },
      }),
    ]);

    const cvDownloads = byPath.find((p) => p.path === "/cv.pdf" || p.path === "/api/cv/download")?._count?.path ?? 0;

    const byIPFiltered = filterByExcludedIP(byIP.map((p) => ({ ip: p.ip, count: p._count.ip })));
    const recentFiltered = filterByExcludedIP(recent);

    return NextResponse.json({
      total,
      byPath: byPath.map((p) => ({ path: p.path, count: p._count.path })),
      byIP: byIPFiltered,
      byCountry: byCountry
        .filter((c) => c.country)
        .map((c) => ({ country: c.country!, count: c._count.country })),
      avgDurationSeconds: withDuration._count.durationSeconds
        ? Math.round((withDuration._avg.durationSeconds ?? 0) * 10) / 10
        : null,
      durationSampleCount: withDuration._count.durationSeconds,
      cvDownloads,
      recent: recentFiltered.map((r) => ({
        path: r.path,
        ip: r.ip,
        country: r.country,
        city: r.city,
        durationSeconds: r.durationSeconds,
        createdAt: r.createdAt.toISOString(),
      })),
      filterIP: filterIP || undefined,
      excludedIPs:
        excludedSet.size > 0 || excludedPrefixes.length > 0
          ? [...Array.from(excludedSet), ...excludedPrefixes]
          : undefined,
    });
  } catch (e) {
    console.error("Analytics stats error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
