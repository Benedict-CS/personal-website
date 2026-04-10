import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardInteractiveCardClassName } from "@/components/dashboard/dashboard-ui";
import {
  type FreshnessSummary,
  freshnessGradeColor,
} from "@/lib/content-freshness";
import { Clock, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

function GradePill({ grade, count }: { grade: string; count: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1">
      <span className="text-xs font-medium text-foreground">{count}</span>
      <span className="text-[11px] text-muted-foreground">{grade}</span>
    </div>
  );
}

export function ContentFreshnessCard({ summary }: { summary: FreshnessSummary }) {
  if (summary.totalPublished === 0) {
    return (
      <Card className={dashboardInteractiveCardClassName()}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Content freshness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No published posts yet. Freshness tracking starts after publishing.</p>
        </CardContent>
      </Card>
    );
  }

  const healthPct = summary.totalPublished > 0
    ? Math.round(((summary.freshCount + summary.currentCount) / summary.totalPublished) * 100)
    : 0;

  const healthColor = healthPct >= 70
    ? "text-emerald-700"
    : healthPct >= 40
      ? "text-amber-700"
      : "text-rose-700";

  return (
    <Card className={dashboardInteractiveCardClassName()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" />
          Content freshness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health score + grade distribution */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tabular-nums ${healthColor}`}>{healthPct}%</span>
            <span className="text-xs text-muted-foreground">of content is fresh or current</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Avg age: <span className="font-medium text-foreground">{summary.averageAge}d</span></span>
          </div>
        </div>

        {/* Grade distribution bar */}
        <div className="space-y-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
            {summary.freshCount > 0 && (
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${(summary.freshCount / summary.totalPublished) * 100}%` }}
                title={`${summary.freshCount} Fresh (≤30d)`}
              />
            )}
            {summary.currentCount > 0 && (
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${(summary.currentCount / summary.totalPublished) * 100}%` }}
                title={`${summary.currentCount} Current (31-90d)`}
              />
            )}
            {summary.agingCount > 0 && (
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(summary.agingCount / summary.totalPublished) * 100}%` }}
                title={`${summary.agingCount} Aging (91-180d)`}
              />
            )}
            {summary.staleCount > 0 && (
              <div
                className="h-full bg-rose-400 transition-all"
                style={{ width: `${(summary.staleCount / summary.totalPublished) * 100}%` }}
                title={`${summary.staleCount} Stale (>180d)`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <GradePill grade="Fresh" count={summary.freshCount} colorClass="emerald" />
            <GradePill grade="Current" count={summary.currentCount} colorClass="sky" />
            <GradePill grade="Aging" count={summary.agingCount} colorClass="amber" />
            <GradePill grade="Stale" count={summary.staleCount} colorClass="rose" />
          </div>
        </div>

        {/* Stalest posts needing refresh */}
        {summary.stalestPosts.length > 0 && summary.staleCount + summary.agingCount > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {summary.staleCount > 0 ? (
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
              )}
              Posts needing refresh
            </p>
            <ul className="space-y-1.5">
              {summary.stalestPosts
                .filter((p) => p.grade === "Stale" || p.grade === "Aging")
                .slice(0, 4)
                .map((post) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/posts/${post.id}`}
                        className="block truncate text-xs font-medium text-foreground hover:underline"
                      >
                        {post.title}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {post.daysSinceUpdate}d since update
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${freshnessGradeColor(post.grade)}`}
                    >
                      {post.grade}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* All fresh celebration */}
        {summary.staleCount === 0 && summary.agingCount === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            All published content is fresh or current. Great job keeping content up to date!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
