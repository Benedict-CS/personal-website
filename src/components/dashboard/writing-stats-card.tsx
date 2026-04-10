import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardInteractiveCardClassName } from "@/components/dashboard/dashboard-ui";
import { type WritingStats } from "@/lib/writing-stats";
import { BookOpen, TrendingUp, TrendingDown, Minus, BarChart3, Tag, Clock, FileText } from "lucide-react";

function StatCell({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-foreground leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-5 w-full rounded bg-muted/40">
      <div
        className="h-5 rounded bg-primary/70 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WritingStatsCard({ stats }: { stats: WritingStats }) {
  const maxWeekly = Math.max(1, ...stats.weeklyActivity.map((w) => w.count));
  const deltaIcon =
    stats.monthOverMonthDelta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> :
    stats.monthOverMonthDelta < 0 ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> :
    <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const deltaColor =
    stats.monthOverMonthDelta > 0 ? "text-emerald-700" :
    stats.monthOverMonthDelta < 0 ? "text-rose-600" :
    "text-muted-foreground";

  return (
    <Card className={dashboardInteractiveCardClassName()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          Writing statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell
            label="Total words"
            value={stats.totalWords.toLocaleString()}
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCell
            label="Avg. words / post"
            value={stats.avgWordsPerPost.toLocaleString()}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatCell
            label="Avg. reading time"
            value={`${stats.avgReadingMinutes} min`}
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCell
            label="Posts this month"
            value={stats.postsThisMonth}
            icon={deltaIcon}
          />
        </div>

        {/* Month-over-month delta */}
        <div className="flex items-center gap-2 text-xs">
          {deltaIcon}
          <span className={deltaColor}>
            {stats.monthOverMonthDelta > 0 ? "+" : ""}
            {stats.monthOverMonthDelta}% vs last month
          </span>
          <span className="text-muted-foreground">
            ({stats.postsLastMonth} post{stats.postsLastMonth !== 1 ? "s" : ""} last month)
          </span>
        </div>

        {/* Weekly activity sparkline */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Weekly publishing (last 12 weeks)</p>
          <div className="flex items-end gap-1" style={{ height: 48 }}>
            {stats.weeklyActivity.map((week, i) => {
              const height = maxWeekly > 0 ? Math.max(2, (week.count / maxWeekly) * 48) : 2;
              return (
                <div
                  key={i}
                  className="group relative flex-1"
                  title={`${week.label}: ${week.count} post${week.count !== 1 ? "s" : ""}`}
                >
                  <div
                    className={`w-full rounded-sm transition-colors ${
                      week.count > 0 ? "bg-primary/60 hover:bg-primary/80" : "bg-muted/50"
                    }`}
                    style={{ height }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
            <span>{stats.weeklyActivity[0]?.label}</span>
            <span>{stats.weeklyActivity[stats.weeklyActivity.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top tags */}
        {stats.topTags.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Top tags
            </p>
            <div className="space-y-1.5">
              {stats.topTags.slice(0, 5).map((tag) => (
                <div key={tag.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-foreground">{tag.name}</span>
                  <MiniBar value={tag.count} max={stats.topTags[0].count} />
                  <span className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">{tag.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
