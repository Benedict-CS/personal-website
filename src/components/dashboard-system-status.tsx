"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";

type HealthResponse = {
  ok: boolean;
  db: "ok" | "error";
  version?: string;
};

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${ms} ms`;
}

export function DashboardSystemStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    const started = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const ended = performance.now();
      setLatencyMs(Math.round(ended - started));
      if (res.ok) {
        const data = (await res.json()) as HealthResponse;
        setHealth(data);
      } else {
        setHealth({ ok: false, db: "error" });
      }
    } catch {
      setHealth({ ok: false, db: "error" });
      setLatencyMs(null);
    } finally {
      setLastCheckedAt(new Date().toLocaleTimeString("en-US"));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
    const timer = setInterval(runCheck, 30000);
    return () => clearInterval(timer);
  }, [runCheck]);

  const statusText = useMemo(() => {
    if (!health) return "Checking";
    return health.ok && health.db === "ok" ? "Healthy" : "Degraded";
  }, [health]);

  const statusClass = health?.ok
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">System status</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runCheck}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
          >
            {statusText}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <p>
            <span className="font-medium text-slate-800">API</span>:{" "}
            {health?.ok ? "OK" : "Error"}
          </p>
          <p>
            <span className="font-medium text-slate-800">Database</span>:{" "}
            {health?.db === "ok" ? "Connected" : "Unavailable"}
          </p>
          <p>
            <span className="font-medium text-slate-800">Latency</span>:{" "}
            {formatMs(latencyMs)}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Last checked: {lastCheckedAt || "—"} (auto refresh every 30s)
        </p>
      </CardContent>
    </Card>
  );
}

