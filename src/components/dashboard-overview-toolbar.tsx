"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardOverviewToolbar({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(generatedAt);

  const refreshedLabel = useMemo(() => formatTimestamp(lastRefreshedAt), [lastRefreshedAt]);

  const refreshNow = () => {
    startTransition(() => {
      router.refresh();
      setLastRefreshedAt(new Date().toISOString());
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] shadow-[var(--shadow-sm)]">
        Last refreshed: {refreshedLabel}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2 rounded-lg transition-colors duration-200"
        onClick={refreshNow}
        disabled={isPending}
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        Refresh now
      </Button>
    </div>
  );
}
