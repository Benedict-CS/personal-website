import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteConfigForRender } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSystemStatus } from "@/components/dashboard-system-status";
import { DashboardNextSteps } from "@/components/dashboard-next-steps";
import { DashboardBackupTrigger } from "@/components/dashboard-backup-trigger";
import { DashboardExportImport } from "@/components/dashboard-export-import";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";

export const dynamic = "force-dynamic";

type OverviewMetrics = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalCustomPages: number;
  liveCustomPages: number;
  auditToday: number;
  hasPosts: boolean;
  hasCustomPages: boolean;
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
};

async function loadOverviewMetrics(): Promise<OverviewMetrics> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalCustomPages,
      liveCustomPages,
      auditToday,
      recentActivity,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({
        where: {
          OR: [{ published: true }, { publishedAt: { lte: now } }],
        },
      }),
      prisma.post.count({
        where: {
          AND: [
            { published: false },
            { OR: [{ publishedAt: null }, { publishedAt: { gt: now } }] },
          ],
        },
      }),
      prisma.customPage.count(),
      prisma.customPage.count({
        where: { published: true },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          resourceType: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalCustomPages,
      liveCustomPages,
      auditToday,
      hasPosts: totalPosts > 0,
      hasCustomPages: totalCustomPages > 0,
      recentActivity: recentActivity.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  } catch {
    return {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      totalCustomPages: 0,
      liveCustomPages: 0,
      auditToday: 0,
      hasPosts: false,
      hasCustomPages: false,
      recentActivity: [],
    };
  }
}

export default async function DashboardHomePage() {
  const [{ url }, metrics] = await Promise.all([getSiteConfigForRender(), loadOverviewMetrics()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard overview</h1>
          <p className="text-sm text-slate-600">
            Monitor content status, system health, and recent operations in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/editor/home">
            <Button size="sm">Open visual editor</Button>
          </Link>
          <Link href="/dashboard/content/pages">
            <Button size="sm" variant="outline">Manage custom pages</Button>
          </Link>
          <Link href="/dashboard/audit">
            <Button size="sm" variant="outline">Open audit log</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/posts" className="block rounded-md transition hover:bg-slate-50">
              <p className="text-2xl font-semibold text-slate-900">{metrics.totalPosts}</p>
              <p className="mt-1 text-xs text-slate-500">Open published posts</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link href="/dashboard/posts" className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50">
                {metrics.publishedPosts} live
              </Link>
              <Link href="/dashboard/notes" className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50">
                {metrics.draftPosts} draft
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Custom pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/content/pages" className="block rounded-md transition hover:bg-slate-50">
              <p className="text-2xl font-semibold text-slate-900">{metrics.totalCustomPages}</p>
              <p className="mt-1 text-xs text-slate-500">Open custom pages manager</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/dashboard/content/pages?status=published"
                className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
              >
                {metrics.liveCustomPages} live
              </Link>
              <Link
                href="/dashboard/content/pages?status=draft"
                className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
              >
                {Math.max(0, metrics.totalCustomPages - metrics.liveCustomPages)} draft
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Audit events today</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/audit" className="block rounded-md transition hover:bg-slate-50">
              <p className="text-2xl font-semibold text-slate-900">{metrics.auditToday}</p>
              <p className="mt-1 text-xs text-slate-500">Tracks publish, page updates, optimize runs, and more</p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <DashboardSystemStatus />
          <DashboardRecentActivity entries={metrics.recentActivity} />
        </div>
        <div className="space-y-4">
          <DashboardNextSteps
            hasPosts={metrics.hasPosts}
            hasCustomPages={metrics.hasCustomPages}
            siteUrl={url}
          />
          <DashboardQuickActions />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashboardBackupTrigger />
            <DashboardExportImport />
          </div>
        </div>
      </div>
    </div>
  );
}
