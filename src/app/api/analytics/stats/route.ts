import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getExcludedIPsForNotIn, getExcludedIPsSet, getExcludedPrefixes, filterByExcludedIP } from "@/lib/analytics-excluded-ips";
import { prismaWhereExcludeLocalAndUnknownIp, prismaWhereExcludeNoise } from "@/lib/analytics-noise";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const filterIP = request.nextUrl.searchParams.get("ip")?.trim() || null;
  const includeDevIps = request.nextUrl.searchParams.get("includeDevIps") === "1";
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

  const baseWhere: Prisma.PageViewWhereInput = {};
  if (filterIP) {
    baseWhere.ip = filterIP;
  } else {
    const andParts: Prisma.PageViewWhereInput[] = [];
    if (excludedForNotIn.length > 0) andParts.push({ ip: { notIn: excludedForNotIn } });
    excludedPrefixes.forEach((p) => andParts.push({ ip: { not: { startsWith: p } } }));
    if (andParts.length === 1) Object.assign(baseWhere, andParts[0]);
    else if (andParts.length > 1) baseWhere.AND = andParts;
  }
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;
  if (Object.keys(dateFilter).length) baseWhere.createdAt = dateFilter;

  /** Real-traffic filters: probe paths, scanner UAs, and by default non-public client IPs */
  const whereParts: Prisma.PageViewWhereInput[] = [baseWhere, prismaWhereExcludeNoise()];
  if (!filterIP && !includeDevIps) {
    whereParts.push(prismaWhereExcludeLocalAndUnknownIp());
  }
  const where: Prisma.PageViewWhereInput = { AND: whereParts };

  const blockWhere: Prisma.AccessBlockLogWhereInput = {};
  if (filterIP) {
    blockWhere.ip = filterIP;
  }
  if (Object.keys(dateFilter).length) blockWhere.createdAt = dateFilter;

  const now = new Date();
  const publishedPostsWhere: Prisma.PostWhereInput = {
    OR: [{ published: true }, { publishedAt: { lte: now } }],
  };

  const cvParts: Prisma.PageViewWhereInput[] = [
    baseWhere,
    prismaWhereExcludeNoise(),
    { OR: [{ path: "/cv.pdf" }, { path: "/api/cv/download" }] },
  ];
  if (!filterIP && !includeDevIps) {
    cvParts.push(prismaWhereExcludeLocalAndUnknownIp());
  }
  const cvWhere: Prisma.PageViewWhereInput = { AND: cvParts };

  try {
    const [total, cvDownloads, byPath, byIP, byCountry, byReferrer, withDuration, recent, topBlogPosts, accessBlockTotal, accessBlockedRecent] =
      await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.count({ where: cvWhere }),
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
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        take: 50,
      }),
      prisma.pageView.groupBy({
        by: ["country"],
        where: { ...where, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 30,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { ...where, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 25,
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
        select: {
          path: true,
          ip: true,
          country: true,
          city: true,
          durationSeconds: true,
          referrer: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.post.findMany({
        where: publishedPostsWhere,
        orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
        take: 20,
        select: { title: true, slug: true, viewCount: true },
      }),
      prisma.accessBlockLog.count({ where: blockWhere }),
      prisma.accessBlockLog.findMany({
        where: blockWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { ip: true, path: true, userAgent: true, createdAt: true },
      }),
    ]);

    const byIPFiltered = filterByExcludedIP(
      byIP.map((p) => ({
        ip: p.ip,
        count: p._count.ip,
        lastVisit: p._max.createdAt?.toISOString() ?? "",
      }))
    );
    const recentFiltered = filterByExcludedIP(recent);

    return NextResponse.json({
      total,
      byPath: byPath.map((p) => ({ path: p.path, count: p._count.path })),
      byIP: byIPFiltered.map((p) => ({
        ip: p.ip,
        count: p.count,
        lastVisit: p.lastVisit || undefined,
      })),
      byCountry: byCountry
        .filter((c) => c.country)
        .map((c) => ({ country: c.country!, count: c._count.country })),
      byReferrer: byReferrer
        .filter((r) => r.referrer)
        .map((r) => ({ referrer: r.referrer!, count: r._count.referrer })),
      avgDurationSeconds: withDuration._count.durationSeconds
        ? Math.round((withDuration._avg.durationSeconds ?? 0) * 10) / 10
        : null,
      durationSampleCount: withDuration._count.durationSeconds,
      cvDownloads,
      topBlogPosts: topBlogPosts.map((p) => ({
        title: p.title,
        slug: p.slug,
        viewCount: p.viewCount,
      })),
      recent: recentFiltered.map((r) => ({
        path: r.path,
        ip: r.ip,
        country: r.country,
        city: r.city,
        durationSeconds: r.durationSeconds,
        referrer: r.referrer,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
      accessBlockTotal,
      accessBlockedRecent: accessBlockedRecent.map((r) => ({
        ip: r.ip,
        path: r.path,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
      filterIP: filterIP || undefined,
      excludingDevIps: !filterIP && !includeDevIps,
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
