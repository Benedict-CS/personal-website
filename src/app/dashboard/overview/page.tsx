import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MotionCard } from "@/components/ui/motion-card";
import { DashboardSystemStatus } from "@/components/dashboard-system-status";
import { DashboardExportImport } from "@/components/dashboard-export-import";
import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";
import { DashboardOverviewToolbar } from "@/components/dashboard-overview-toolbar";
import { DashboardOperationsCard } from "@/components/dashboard-operations-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";

export const dynamic = "force-dynamic";

type OverviewMetrics = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalCustomPages: number;
  liveCustomPages: number;
  auditToday: number;
  warningEventsToday: number;
  latestWarningAction: string | null;
  latestWarningAt: string | null;
  hasPosts: boolean;
  hasCustomPages: boolean;
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
};

function isWarningAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return [
    ".delete",
    ".restore",
    ".bulk",
    ".import",
    ".merge",
    ".cleanup",
    ".optimize",
  ].some((keyword) => normalized.includes(keyword));
}

function formatCompactDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      auditTodayActions,
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
        where: { createdAt: { gte: todayStart } },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          action: true,
          createdAt: true,
        },
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
      warningEventsToday: auditTodayActions.filter((item) => isWarningAction(item.action)).length,
      latestWarningAction: auditTodayActions.find((item) => isWarningAction(item.action))?.action ?? null,
      latestWarningAt:
        auditTodayActions.find((item) => isWarningAction(item.action))?.createdAt.toISOString() ?? null,
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
      warningEventsToday: 0,
      latestWarningAction: null,
      latestWarningAt: null,
      hasPosts: false,
      hasCustomPages: false,
      recentActivity: [],
    };
  }
}

export default async function DashboardOverviewPage() {
  const generatedAt = new Date().toISOString();
  const metrics = await loadOverviewMetrics();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Overview"
        title="Dashboard overview"
        description="Monitor content status, system health, and recent operations in one place."
      >
        <DashboardOverviewToolbar generatedAt={generatedAt} />
        <Link href="/editor/home">
          <Button size="sm">Open visual editor</Button>
        </Link>
        <Link href="/dashboard/content/pages">
          <Button size="sm" variant="outline">Manage custom pages</Button>
        </Link>
        <Link href="/dashboard/audit">
          <Button size="sm" variant="outline">Open audit log</Button>
        </Link>
        <Link href="/dashboard/analytics">
          <Button size="sm" variant="outline">Analytics</Button>
        </Link>
        <Link href="/dashboard/content/site">
          <Button size="sm" variant="outline">Site &amp; SEO</Button>
        </Link>
      </DashboardPageHeader>

      <MotionCard
        delayIndex={0}
        className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-md backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                metrics.warningEventsToday > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {metrics.warningEventsToday > 0
                ? `${metrics.warningEventsToday} warning events today`
                : "No warning events today"}
            </span>
            {metrics.latestWarningAction ? (
              <span className="text-muted-foreground">
                Latest: <span className="font-medium text-foreground">{metrics.latestWarningAction}</span>
                {metrics.latestWarningAt ? ` · ${formatCompactDateTime(metrics.latestWarningAt)}` : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">Recent operations look stable.</span>
            )}
          </div>
          <Link href="/dashboard/audit?risk=high">
            <Button size="sm" variant="outline">
              Open risk-focused audit
            </Button>
          </Link>
        </div>
      </MotionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MotionCard delayIndex={1}>
        <Card className="border-border shadow-md transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/posts" className="block rounded-lg py-1 transition-colors hover:bg-muted/40">
              <p className="text-2xl font-semibold text-foreground">{metrics.totalPosts}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open published posts</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link href="/dashboard/posts" className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted/40">
                {metrics.publishedPosts} live
              </Link>
              <Link href="/dashboard/notes" className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted/40">
                {metrics.draftPosts} draft
              </Link>
            </div>
          </CardContent>
        </Card>
        </MotionCard>
        <MotionCard delayIndex={2}>
        <Card className="border-border shadow-md transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custom pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/content/pages" className="block rounded-lg py-1 transition-colors hover:bg-muted/40">
              <p className="text-2xl font-semibold text-foreground">{metrics.totalCustomPages}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open custom pages manager</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/dashboard/content/pages?status=published"
                className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted/40"
              >
                {metrics.liveCustomPages} live
              </Link>
              <Link
                href="/dashboard/content/pages?status=draft"
                className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted/40"
              >
                {Math.max(0, metrics.totalCustomPages - metrics.liveCustomPages)} draft
              </Link>
            </div>
          </CardContent>
        </Card>
        </MotionCard>
        <MotionCard delayIndex={3}>
        <Card className="border-border shadow-md transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit events today</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/audit" className="block rounded-lg py-1 transition-colors hover:bg-muted/40">
              <p className="text-2xl font-semibold text-foreground">{metrics.auditToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tracks publish, page updates, optimize runs, and more</p>
            </Link>
          </CardContent>
        </Card>
        </MotionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MotionCard delayIndex={4} className="space-y-4 xl:col-span-2">
          <DashboardSystemStatus />
          <DashboardRecentActivity entries={metrics.recentActivity} />
        </MotionCard>
        <MotionCard delayIndex={5} className="space-y-4">
          <DashboardOperationsCard />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashboardExportImport />
          </div>
        </MotionCard>
      </div>
    </div>
  );
}
