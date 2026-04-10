import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardInteractiveCardClassName } from "@/components/dashboard/dashboard-ui";
import { type QualityReport, type QualityTier } from "@/lib/content-quality-report";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Trophy,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<QualityTier, { bg: string; text: string; label: string }> = {
  excellent: { bg: "bg-emerald-400", text: "text-emerald-700", label: "Excellent" },
  good: { bg: "bg-sky-400", text: "text-sky-700", label: "Good" },
  fair: { bg: "bg-amber-400", text: "text-amber-700", label: "Fair" },
  poor: { bg: "bg-rose-400", text: "text-rose-700", label: "Poor" },
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "text-rose-600 bg-rose-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-muted-foreground bg-muted/40",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-sky-700";
  if (score >= 40) return "text-amber-700";
  return "text-rose-700";
}

export function ContentQualityReportCard({ report }: { report: QualityReport }) {
  if (report.totalPosts === 0) {
    return (
      <Card className={dashboardInteractiveCardClassName()}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Gauge className="h-4 w-4" />
            Content quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No published posts to analyze. Publish some content to see quality metrics.</p>
        </CardContent>
      </Card>
    );
  }

  const tiers: QualityTier[] = ["excellent", "good", "fair", "poor"];

  return (
    <Card className={dashboardInteractiveCardClassName()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gauge className="h-4 w-4" />
          Content quality report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall score + tier distribution */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-semibold tabular-nums", scoreColor(report.averageScore))}>
              {report.averageScore}
            </span>
            <span className="text-xs text-muted-foreground">avg quality score across {report.totalPosts} post{report.totalPosts !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Tier distribution bar */}
        <div className="space-y-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
            {tiers.map((tier) =>
              report.tierDistribution[tier] > 0 ? (
                <div
                  key={tier}
                  className={cn("h-full transition-all", TIER_STYLES[tier].bg)}
                  style={{ width: `${(report.tierDistribution[tier] / report.totalPosts) * 100}%` }}
                  title={`${report.tierDistribution[tier]} ${TIER_STYLES[tier].label}`}
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <div
                key={tier}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1"
              >
                <div className={cn("h-2 w-2 rounded-full", TIER_STYLES[tier].bg)} />
                <span className="text-xs font-medium text-foreground">{report.tierDistribution[tier]}</span>
                <span className="text-[11px] text-muted-foreground">{TIER_STYLES[tier].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Common issues */}
        {report.commonIssues.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Common issues
            </p>
            <ul className="space-y-1">
              {report.commonIssues.slice(0, 5).map((issue, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5"
                >
                  <span className="truncate text-[11px] text-foreground">{issue.issue}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY_STYLES[issue.severity])}>
                      {issue.severity}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{issue.count}×</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action items */}
        {report.actionItems.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5 text-rose-500" />
              Posts needing attention
            </p>
            <ul className="space-y-1.5">
              {report.actionItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/posts/${item.id}`}
                      className="block truncate text-xs font-medium text-foreground hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.topIssue && (
                      <span className="text-[10px] text-muted-foreground">{item.topIssue}</span>
                    )}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums", TIER_STYLES[item.tier].text, TIER_STYLES[item.tier].bg + "/20")}>
                    {item.compositeScore}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top performers */}
        {report.topPerformers.length > 0 && report.topPerformers[0].compositeScore >= 60 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-emerald-500" />
              Top performers
            </p>
            <div className="flex flex-wrap gap-2">
              {report.topPerformers.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/posts/${item.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">{item.title}</span>
                  <span className="tabular-nums">{item.compositeScore}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All clear celebration */}
        {report.commonIssues.length === 0 && report.actionItems.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            All published content meets quality standards. Excellent work!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
