import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, HeartPulse, Replace, Server } from "lucide-react";

/**
 * Static operator hints for monitors, probes, and repository documentation paths.
 * Does not expose secrets; URLs are public health endpoints.
 */
export function DashboardOperationsCard() {
  return (
    <Card className="border-[var(--border)] shadow-[var(--shadow-md)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Server className="h-4 w-4 shrink-0" aria-hidden />
          Operations &amp; portability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground/90">
        <p className="text-muted-foreground">
          Point uptime monitors at <span className="font-mono text-xs text-foreground">/api/live</span>{" "}
          (liveness, no DB) and <span className="font-mono text-xs text-foreground">/api/health</span>{" "}
          (readiness with database). Use <span className="font-mono text-xs">scripts/verify-health.sh</span>{" "}
          after deploy.
        </p>
        <ul className="space-y-1.5 border-l-2 border-border pl-3 text-xs text-muted-foreground">
          <li>
            <span className="font-mono text-[11px] text-foreground">docs/MIGRATION_CHECKLIST.md</span> — data
            and config migration
          </li>
          <li>
            <span className="font-mono text-[11px] text-foreground">docs/TROUBLESHOOTING.md</span> — common
            failures
          </li>
          <li>
            <span className="font-mono text-[11px] text-foreground">docs/OPERATIONS_QUICK_REFERENCE.md</span>{" "}
            — commands and endpoints
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/dashboard/posts/operations"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted/50"
          >
            <Replace className="h-3.5 w-3.5" aria-hidden />
            Find &amp; replace
          </Link>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted/50"
          >
            <HeartPulse className="h-3.5 w-3.5" aria-hidden />
            Analytics
          </Link>
          <Link
            href="/dashboard/setup"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted/50"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Setup wizard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
