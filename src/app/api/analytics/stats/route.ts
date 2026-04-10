import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getExcludedIPsForNotIn, getExcludedIPsSet, getExcludedPrefixes, filterByExcludedIP } from "@/lib/analytics-excluded-ips";
import { prismaWhereExcludeLocalAndUnknownIp, prismaWhereExcludeNoise } from "@/lib/analytics-noise";
import { buildDailyAnalyticsTrendWithKernel } from "@/lib/analytics-trend";
import { buildConversionAttributionBySlug, buildTopEngagedContent } from "@/lib/analytics-engagement";

type ReferrerGroup = "Direct / Unknown" | "Search Engines" | "Social Media" | "GitHub" | "Developer Communities" | "Other";

function categorizeReferrer(referrer: string | null): ReferrerGroup {
  if (!referrer) return "Direct / Unknown";
  const value = referrer.toLowerCase();
  if (value.includes("google.") || value.includes("bing.") || value.includes("duckduckgo.") || value.includes("yahoo.")) {
    return "Search Engines";
  }
  if (
    value.includes("linkedin.") ||
    value.includes("x.com") ||
    value.includes("twitter.com") ||
    value.includes("facebook.") ||
    value.includes("instagram.")
  ) {
    return "Social Media";
  }
  if (value.includes("github.com")) return "GitHub";
  if (value.includes("dev.to") || value.includes("hashnode.") || value.includes("reddit.")) {
    return "Developer Communities";
  }
  return "Other";
}

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

  /** Blocked-access log: exclude the internal logging endpoint (otherwise dashboard refresh inflates counts). */
  const blockWhereParts: Prisma.AccessBlockLogWhereInput[] = [
    { path: { not: "/api/analytics/access-block-log" } },
  ];
  if (filterIP) {
    blockWhereParts.push({ ip: filterIP });
  }
  if (Object.keys(dateFilter).length) {
    blockWhereParts.push({ createdAt: dateFilter });
  }
  const blockWhere: Prisma.AccessBlockLogWhereInput =
    blockWhereParts.length === 1 ? blockWhereParts[0]! : { AND: blockWhereParts };

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
  const eventWhere: Prisma.AuditLogWhereInput = {
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    ...(filterIP ? { ip: filterIP } : {}),
    action: { in: ["analytics.cv_download", "analytics.lead_generated"] },
  };
  const trendStart = fromDate ?? new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const trendEnd = toDate ?? now;
  const trendDateFilter = { gte: trendStart, lte: trendEnd };
  const trendWhere: Prisma.PageViewWhereInput = { ...where, createdAt: trendDateFilter };
  const trendEventWhere: Prisma.AuditLogWhereInput = {
    ...eventWhere,
    createdAt: trendDateFilter,
  };

  try {
    const [
      total,
      uniqueIpRows,
      cvDownloads,
      byPath,
      byIP,
      byCountry,
      byReferrer,
      withDuration,
      recent,
      topBlogPosts,
      accessBlockTotal,
      accessBlockedRecent,
      conversionEvents,
      conversionAttributionEvents,
      trendPageViews,
      trendEvents,
      blogPathViews,
    ] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.groupBy({
        by: ["ip"],
        where,
        _count: { ip: true },
      }),
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
      prisma.auditLog.groupBy({
        by: ["action"],
        where: eventWhere,
        _count: { action: true },
      }),
      prisma.auditLog.findMany({
        where: eventWhere,
        select: {
          action: true,
          details: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.pageView.findMany({
        where: trendWhere,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 10000,
      }),
      prisma.auditLog.findMany({
        where: trendEventWhere,
        select: { createdAt: true, action: true },
        orderBy: { createdAt: "asc" },
        take: 10000,
      }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: {
          ...where,
          path: { startsWith: "/blog/" },
        },
        _count: { path: true },
        _avg: { durationSeconds: true },
        orderBy: { _count: { path: "desc" } },
        take: 200,
      }),
    ]);

    const uniqueVisitors = uniqueIpRows.length;
    const leadGenerated = conversionEvents.find((entry) => entry.action === "analytics.lead_generated")?._count.action ?? 0;
    const cvDownloadEvents = conversionEvents.find((entry) => entry.action === "analytics.cv_download")?._count.action ?? 0;
    const effectiveCvDownloads = Math.max(cvDownloads, cvDownloadEvents);
    const referrerGroups = byReferrer.reduce<Record<ReferrerGroup, number>>(
      (acc, row) => {
        const bucket = categorizeReferrer(row.referrer);
        acc[bucket] = (acc[bucket] ?? 0) + row._count.referrer;
        return acc;
      },
      {
        "Direct / Unknown": 0,
        "Search Engines": 0,
        "Social Media": 0,
        GitHub: 0,
        "Developer Communities": 0,
        Other: 0,
      }
    );
    const byIPFiltered = filterByExcludedIP(
      byIP.map((p) => ({
        ip: p.ip,
        count: p._count.ip,
        lastVisit: p._max.createdAt?.toISOString() ?? "",
      }))
    );
    const recentFiltered = filterByExcludedIP(recent);
    const trendByDay = await buildDailyAnalyticsTrendWithKernel({
      start: trendStart.toISOString().slice(0, 10),
      end: trendEnd.toISOString().slice(0, 10),
      pageViews: trendPageViews,
      events: trendEvents.map((event) => ({ createdAt: event.createdAt, action: event.action })),
    });
    const blogSlugs = Array.from(
      new Set(
        blogPathViews
          .map((row) => row.path.replace("/blog/", "").split("/")[0]?.trim() ?? "")
          .filter((slug) => slug.length > 0)
      )
    );
    const postRows = await prisma.post.findMany({
      where: { slug: { in: blogSlugs } },
      select: { slug: true, title: true },
    });
    const postMap = new Map(postRows.map((row) => [row.slug, { title: row.title }]));
    const conversionBySlug = buildConversionAttributionBySlug(
      conversionAttributionEvents
        .filter(
          (event): event is { action: "analytics.cv_download" | "analytics.lead_generated"; details: string | null } =>
            event.action === "analytics.cv_download" || event.action === "analytics.lead_generated"
        )
        .map((event) => ({ action: event.action, details: event.details }))
    );
    const topEngagedContent = buildTopEngagedContent({
      paths: blogPathViews.map((row) => {
        const slug = row.path.replace("/blog/", "").split("/")[0]?.trim() ?? "";
        const conversion = conversionBySlug.get(slug) ?? { cvDownloads: 0, leads: 0 };
        return {
          path: row.path,
          views: row._count.path,
          avgDurationSeconds: Math.round((row._avg.durationSeconds ?? 0) * 10) / 10,
          cvDownloads: conversion.cvDownloads,
          leads: conversion.leads,
        };
      }),
      postsBySlug: postMap,
    });

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
      byReferrerGroup: Object.entries(referrerGroups)
        .filter(([, count]) => count > 0)
        .map(([group, count]) => ({ group, count })),
      avgDurationSeconds: withDuration._count.durationSeconds
        ? Math.round((withDuration._avg.durationSeconds ?? 0) * 10) / 10
        : null,
      durationSampleCount: withDuration._count.durationSeconds,
      cvDownloads: effectiveCvDownloads,
      leadGenerated,
      uniqueVisitors,
      conversionFunnel: {
        visitors: uniqueVisitors,
        cvDownloads: effectiveCvDownloads,
        leads: leadGenerated,
      },
      trendByDay,
      topBlogPosts: topBlogPosts.map((p) => ({
        title: p.title,
        slug: p.slug,
        viewCount: p.viewCount,
      })),
      topEngagedContent,
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
