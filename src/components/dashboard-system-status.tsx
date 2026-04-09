"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Copy, RefreshCw } from "lucide-react";

type HealthResponse = {
  ok: boolean;
  db: "ok" | "error";
  version?: string;
  appVersion?: string;
  uptimeSeconds?: number;
  node?: string;
};

type HealthSnapshot = {
  ok: boolean;
  db: "ok" | "error";
  latencyMs: number | null;
  checkedAt: string;
};

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${ms} ms`;
}

async function timedFetch(url: string): Promise<{ res: Response | null; ms: number | null }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const ms = Math.round(performance.now() - t0);
    return { res, ms };
  } catch {
    return { res: null, ms: null };
  }
}

export function DashboardSystemStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);
  const [liveOk, setLiveOk] = useState<boolean | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [history, setHistory] = useState<HealthSnapshot[]>([]);

  const runCheck = useCallback(async () => {
    setLoading(true);
    let snapshot: HealthSnapshot = {
      ok: false,
      db: "error",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
    try {
      const [healthTimed, liveTimed] = await Promise.all([
        timedFetch("/api/health"),
        timedFetch("/api/live"),
      ]);

      setLiveLatencyMs(liveTimed.ms);
      setLiveOk(liveTimed.res !== null && liveTimed.res.ok);

      const measuredLatency = healthTimed.ms;
      setLatencyMs(measuredLatency);

      if (healthTimed.res?.ok) {
        const data = (await healthTimed.res.json()) as HealthResponse;
        setHealth(data);
        snapshot = {
          ok: data.ok,
          db: data.db,
          latencyMs: measuredLatency,
          checkedAt: new Date().toISOString(),
        };
      } else {
        setHealth({ ok: false, db: "error" });
        snapshot = {
          ok: false,
          db: "error",
          latencyMs: measuredLatency,
          checkedAt: new Date().toISOString(),
        };
      }
    } catch {
      setHealth({ ok: false, db: "error" });
      setLatencyMs(null);
      setLiveLatencyMs(null);
      setLiveOk(false);
      snapshot = {
        ok: false,
        db: "error",
        latencyMs: null,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      setLastCheckedAt(new Date().toLocaleTimeString("en-US"));
      setHistory((prev) => [...prev.slice(-11), snapshot]);
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

  const diagnostics = useMemo(() => {
    const recent = history.slice(-10);
    if (recent.length === 0) {
      return {
        successRate: 100,
        avgLatency: null as number | null,
        unstable: false,
      };
    }
    const successCount = recent.filter((item) => item.ok && item.db === "ok").length;
    const successRate = Math.round((successCount / recent.length) * 100);
    const latencySamples = recent
      .map((item) => item.latencyMs)
      .filter((value): value is number => typeof value === "number");
    const avgLatency =
      latencySamples.length > 0
        ? Math.round(latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length)
        : null;
    const unstable = successRate < 80 || (avgLatency != null && avgLatency > 1200);
    return { successRate, avgLatency, unstable };
  }, [history]);

  const copyDiagnostics = async () => {
    const liveLine =
      liveOk === null
        ? ""
        : liveOk
          ? `Liveness (/api/live): OK · ${formatMs(liveLatencyMs)}`
          : `Liveness (/api/live): failed · ${formatMs(liveLatencyMs)}`;
    const summary = [
      `Status: ${statusText}`,
      `API: ${health?.ok ? "OK" : "Error"}`,
      `Database: ${health?.db === "ok" ? "Connected" : "Unavailable"}`,
      liveLine,
      health?.appVersion ? `Deployment: ${health.appVersion}` : "",
      health?.node ? `Node.js: ${health.node}` : "",
      typeof health?.uptimeSeconds === "number" ? `Process uptime: ${health.uptimeSeconds}s` : "",
      `Readiness latency (/api/health): ${formatMs(latencyMs)}`,
      `Success rate (last 10): ${diagnostics.successRate}%`,
      `Average latency (last 10): ${formatMs(diagnostics.avgLatency)}`,
      `Last checked: ${lastCheckedAt || "—"}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg text-foreground">System status</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="gap-2"
          >
            {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Diagnostics
          </Button>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
          >
            {statusText}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">API</span>:{" "}
            {health?.ok ? "OK" : "Error"}
          </p>
          <p>
            <span className="font-medium text-foreground">Database</span>:{" "}
            {health?.db === "ok" ? "Connected" : "Unavailable"}
          </p>
          <p>
            <span className="font-medium text-foreground">Readiness</span>{" "}
            <span className="text-muted-foreground">(/api/health)</span>:{" "}
            {formatMs(latencyMs)}
          </p>
          <p>
            <span className="font-medium text-foreground">Liveness</span>{" "}
            <span className="text-muted-foreground">(/api/live, no DB)</span>:{" "}
            {liveOk === null
              ? "—"
              : liveOk
                ? `OK · ${formatMs(liveLatencyMs)}`
                : liveLatencyMs === null
                  ? "Unreachable"
                  : `Error · ${formatMs(liveLatencyMs)}`}
          </p>
          {typeof health?.uptimeSeconds === "number" ? (
            <p>
              <span className="font-medium text-foreground">Uptime</span>:{" "}
              {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m
            </p>
          ) : null}
          {health?.appVersion ? (
            <p className="min-w-0">
              <span className="font-medium text-foreground">Deployment</span>:{" "}
              <span className="font-mono text-xs break-all">{health.appVersion}</span>
            </p>
          ) : (
            <p>
              <span className="font-medium text-foreground">Deployment</span>:{" "}
              <span className="text-muted-foreground">—</span>
            </p>
          )}
          {health?.node ? (
            <p>
              <span className="font-medium text-foreground">Node.js</span>:{" "}
              <span className="font-mono text-xs">{health.node}</span>
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Last checked: {lastCheckedAt || "—"} (auto refresh every 30s)
        </p>
        {showDiagnostics ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Readiness hits the database; liveness only confirms the Node process responds. Large gaps between the
              two often point to DB latency or pool pressure.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                Success rate: {diagnostics.successRate}%
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                Avg latency: {formatMs(diagnostics.avgLatency)}
              </span>
              {diagnostics.unstable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Potential instability
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800">
                  Stable checks
                </span>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Last checks</p>
              <div className="flex flex-wrap gap-1.5">
                {history.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No samples yet</span>
                ) : (
                  history.slice(-10).map((sample, index) => (
                    <span
                      key={`${sample.checkedAt}-${index}`}
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        sample.ok && sample.db === "ok" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      title={`${sample.ok ? "ok" : "error"} · db:${sample.db} · latency:${formatMs(sample.latencyMs)}`}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="pt-1">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyDiagnostics}>
                <Copy className="h-4 w-4" />
                Copy diagnostics
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

