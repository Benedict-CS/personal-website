import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  getExcludedIPsForNotIn,
  getExcludedIPsSet,
  getExcludedPrefixes,
  filterByExcludedIP,
  isExcludedIP,
} from "@/lib/analytics-excluded-ips";
import {
  findNonHumanVisitorIps,
  prismaWhereExcludeLocalAndUnknownIp,
  prismaWhereExcludeScannerSessionIps,
  prismaWhereRealVisitorPageViews,
} from "@/lib/analytics-noise";
import { splitReferrerRows } from "@/lib/analytics-referrer";
import { buildDailyAnalyticsTrendWithKernel } from "@/lib/analytics-trend";
import { buildConversionAttributionBySlug, buildTopEngagedContent } from "@/lib/analytics-engagement";
import { mergeVisitorByIp } from "@/lib/analytics-cv-downloads";
import { prismaWhereQualifiedPageView } from "@/lib/analytics-qualified-visit";

type ReferrerGroup =
  | "Direct / Unknown"
  | "Search Engines"
  | "Social Media"
  | "GitHub"
  | "Developer Communities"
  | "Your site"
  | "Other";

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

function buildRealVisitorWhere(input: {
  baseWhere: Prisma.PageViewWhereInput;
  includeDevIps: boolean;
  filterIP: string | null;
  scannerSessionIps: string[];
}): Prisma.PageViewWhereInput {
  const parts: Prisma.PageViewWhereInput[] = [
    input.baseWhere,
    prismaWhereRealVisitorPageViews(),
    prismaWhereQualifiedPageView(),
  ];
  if (!input.filterIP && !input.includeDevIps) {
    parts.push(prismaWhereExcludeLocalAndUnknownIp());
  }
  if (!input.filterIP) {
    const excludeSessions = prismaWhereExcludeScannerSessionIps(input.scannerSessionIps);
    if (excludeSessions) parts.push(excludeSessions);
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
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

  const scannerSessionIps = filterIP ? [] : await findNonHumanVisitorIps(prisma, baseWhere);
  const where = buildRealVisitorWhere({ baseWhere, includeDevIps, filterIP, scannerSessionIps });

  const cvWhere: Prisma.PageViewWhereInput = {
    AND: [
      where,
      { OR: [{ path: "/cv.pdf" }, { path: "/api/cv/download" }] },
    ],
  };

  const referrerWhere: Prisma.PageViewWhereInput = {
    AND: [where, { referrer: { not: null } }],
  };
  const directReferrerWhere: Prisma.PageViewWhereInput = {
    AND: [where, { OR: [{ referrer: null }, { referrer: "" }] }],
  };

  const now = new Date();
  const publishedPostsWhere: Prisma.PostWhereInput = {
    OR: [{ published: true }, { publishedAt: { lte: now } }],
  };

  const auditIpParts: Prisma.AuditLogWhereInput[] = [];
  if (filterIP) {
    auditIpParts.push({ ip: filterIP });
  } else {
    if (excludedForNotIn.length > 0) auditIpParts.push({ ip: { notIn: excludedForNotIn } });
    excludedPrefixes.forEach((p) => auditIpParts.push({ ip: { not: { startsWith: p } } }));
  }
  const auditIpWhere: Prisma.AuditLogWhereInput =
    auditIpParts.length === 0
      ? {}
      : auditIpParts.length === 1
        ? auditIpParts[0]!
        : { AND: auditIpParts };

  const leadEventWhereParts: Prisma.AuditLogWhereInput[] = [
    { action: "analytics.lead_generated" },
  ];
  if (Object.keys(dateFilter).length) leadEventWhereParts.push({ createdAt: dateFilter });
  if (Object.keys(auditIpWhere).length) leadEventWhereParts.push(auditIpWhere);
  const leadEventWhere: Prisma.AuditLogWhereInput =
    leadEventWhereParts.length === 1 ? leadEventWhereParts[0]! : { AND: leadEventWhereParts };

  const trendStart = fromDate ?? new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const trendEnd = toDate ?? now;
  const trendDateFilter = { gte: trendStart, lte: trendEnd };
  const trendWhere: Prisma.PageViewWhereInput = { AND: [where, { createdAt: trendDateFilter }] };
  const trendLeadWhere: Prisma.AuditLogWhereInput = {
    ...leadEventWhere,
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
      conversionAttributionEvents,
      trendPageViews,
      trendLeadEvents,
      blogPathViews,
      recentCvDownloadsRaw,
      cvByIpWithDates,
      leadGenerated,
      directVisits,
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
        where: referrerWhere,
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 80,
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
        orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" } ],
        take: 20,
        select: { title: true, slug: true, viewCount: true },
      }),
      prisma.auditLog.findMany({
        where: leadEventWhere,
        select: { action: true, details: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.pageView.findMany({
        where: trendWhere,
        select: { createdAt: true, path: true },
        orderBy: { createdAt: "asc" },
        take: 10000,
      }),
      prisma.auditLog.findMany({
        where: trendLeadWhere,
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
      prisma.pageView.findMany({
        where: cvWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          path: true,
          ip: true,
          country: true,
          city: true,
          referrer: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.pageView.groupBy({
        by: ["ip"],
        where: cvWhere,
        _count: { ip: true },
        _max: { createdAt: true },
      }),
      prisma.auditLog.count({ where: leadEventWhere }),
      prisma.pageView.count({ where: directReferrerWhere }),
    ]);

    const cvByIpMerged: { ip: string; count: number; lastVisit?: string }[] = filterByExcludedIP(
      cvByIpWithDates.map((row) => ({
        ip: row.ip,
        count: row._count.ip,
        lastVisit: row._max.createdAt?.toISOString(),
      }))
    );
    const recentCvRows = filterByExcludedIP(recentCvDownloadsRaw).map((r) => ({
      path: r.path,
      ip: r.ip,
      country: r.country,
      city: r.city,
      referrer: r.referrer,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    }));

    const referrerSplit = splitReferrerRows(
      byReferrer.map((row) => ({ referrer: row.referrer, count: row._count.referrer }))
    );

    const referrerGroups = referrerSplit.external.reduce<Record<ReferrerGroup, number>>(
      (acc, row) => {
        const bucket = categorizeReferrer(row.referrer);
        acc[bucket] = (acc[bucket] ?? 0) + row.count;
        return acc;
      },
      {
        "Direct / Unknown": 0,
        "Search Engines": 0,
        "Social Media": 0,
        GitHub: 0,
        "Developer Communities": 0,
        "Your site": 0,
        Other: 0,
      }
    );
    if (referrerSplit.internalTotal > 0) {
      referrerGroups["Your site"] = referrerSplit.internalTotal;
    }
    if (directVisits > 0) {
      referrerGroups["Direct / Unknown"] += directVisits;
    }

    const byIPFiltered = filterByExcludedIP(
      byIP.map((p) => ({
        ip: p.ip,
        count: p._count.ip,
        lastVisit: p._max.createdAt?.toISOString() ?? "",
      }))
    );

    const byIPWithCv = mergeVisitorByIp(byIPFiltered, cvByIpMerged);
    const uniqueVisitors = byIPWithCv.length;

    const trendByDay = buildDailyAnalyticsTrendWithKernel({
      start: trendStart.toISOString().slice(0, 10),
      end: trendEnd.toISOString().slice(0, 10),
      pageViews: trendPageViews,
      events: trendLeadEvents,
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
          (event): event is { action: "analytics.lead_generated"; details: string | null } =>
            event.action === "analytics.lead_generated"
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

    const recentFiltered = filterByExcludedIP(recent);

    return NextResponse.json({
      total,
      byPath: byPath.map((p) => ({ path: p.path, count: p._count.path })),
      byIP: byIPWithCv.map((p) => ({
        ip: p.ip,
        count: p.count,
        lastVisit: p.lastVisit || undefined,
        cvDownloads: p.cvDownloads > 0 ? p.cvDownloads : undefined,
      })),
      byCountry: byCountry
        .filter((c) => c.country)
        .map((c) => ({ country: c.country!, count: c._count.country })),
      byReferrer: referrerSplit.external.slice(0, 15),
      byInternalReferrer: referrerSplit.internal.slice(0, 15),
      byReferrerGroup: Object.entries(referrerGroups)
        .filter(([, count]) => count > 0)
        .map(([group, count]) => ({ group, count }))
        .sort((a, b) => b.count - a.count),
      directVisits,
      avgDurationSeconds: withDuration._count.durationSeconds
        ? Math.round((withDuration._avg.durationSeconds ?? 0) * 10) / 10
        : null,
      durationSampleCount: withDuration._count.durationSeconds,
      cvDownloads,
      leadGenerated,
      uniqueVisitors,
      conversionFunnel: {
        visitors: uniqueVisitors,
        cvDownloads,
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
      recentCvDownloads: recentCvRows,
      excludingDevIps: !filterIP && !includeDevIps,
      realTrafficOnly: true,
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
