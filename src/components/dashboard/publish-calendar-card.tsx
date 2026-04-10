import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardInteractiveCardClassName } from "@/components/dashboard/dashboard-ui";
import { type PublishCalendarData } from "@/lib/publish-calendar";
import { Calendar, Flame, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const DOW_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function postCountColor(count: number, isCurrentMonth: boolean): string {
  if (!isCurrentMonth) return count > 0 ? "bg-emerald-100 text-muted-foreground" : "text-muted-foreground/30";
  if (count >= 3) return "bg-emerald-500 text-white font-semibold";
  if (count >= 2) return "bg-emerald-400 text-white";
  if (count >= 1) return "bg-emerald-200 text-emerald-900";
  return "text-muted-foreground/60";
}

export function PublishCalendarCard({ data }: { data: PublishCalendarData }) {
  const { calendar, streak, busiestDay } = data;

  return (
    <Card className={dashboardInteractiveCardClassName()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Publishing calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month label */}
        <p className="text-center text-xs font-medium text-foreground">{calendar.label}</p>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1">
          {DOW_HEADERS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground/60">
              {d}
            </div>
          ))}

          {/* Calendar grid */}
          {calendar.days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "flex h-7 w-full items-center justify-center rounded-md text-[11px] tabular-nums transition-colors",
                postCountColor(day.postCount, day.isCurrentMonth),
                day.isToday && "ring-1 ring-primary/50",
                !day.isCurrentMonth && "opacity-40"
              )}
              title={
                day.postCount > 0
                  ? `${day.date}: ${day.postCount} post${day.postCount > 1 ? "s" : ""}`
                  : day.date
              }
            >
              {day.dayOfMonth}
            </div>
          ))}
        </div>

        {/* Streak + metrics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <Flame className={cn("h-4 w-4 shrink-0", streak.currentWeeks > 0 ? "text-orange-500" : "text-muted-foreground/40")} />
            <div>
              <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">
                {streak.currentWeeks}w
              </p>
              <p className="text-[10px] text-muted-foreground">Current streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">
                {streak.longestWeeks}w
              </p>
              <p className="text-[10px] text-muted-foreground">Best streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-sky-500" />
            <div>
              <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">
                {streak.totalPublishDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Publish days</p>
            </div>
          </div>
          {busiestDay && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
              <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {busiestDay.label}
                </p>
                <p className="text-[10px] text-muted-foreground">Busiest day</p>
              </div>
            </div>
          )}
        </div>

        {/* Streak status */}
        {streak.isActiveThisWeek ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <Flame className="h-4 w-4 shrink-0" />
            {streak.currentWeeks >= 4
              ? `Outstanding! ${streak.currentWeeks}-week publishing streak going strong.`
              : streak.currentWeeks >= 2
                ? `Nice momentum! ${streak.currentWeeks}-week streak — keep it going!`
                : "You published this week. Start building a streak!"}
          </div>
        ) : streak.totalPublishDays > 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Flame className="h-4 w-4 shrink-0 opacity-50" />
            No post this week yet. Publish to {streak.currentWeeks > 0 ? "extend your streak" : "start a new streak"}!
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No published posts yet. Your publishing calendar will populate as you create content.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
