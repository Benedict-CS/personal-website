"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { TooltipHint } from "@/components/ui/tooltip-hint";

type PageRecord = { id: string; title: string; slug: string; draftBlocks: unknown[] };
type Experiment = {
  id: string;
  name: string;
  status: string;
  trafficSplitA: number;
  trafficSplitB: number;
  winnerVariant: string | null;
  stats?: {
    viewsA?: number;
    viewsB?: number;
    conversionsA?: number;
    conversionsB?: number;
    minSamplePerVariant?: number;
    hasEnoughSample?: boolean;
    conversionRateA?: number;
    conversionRateB?: number;
    pValueApprox?: number;
    significant?: boolean;
  } | null;
  variants: Array<{ id: string; key: string; title: string }>;
};

export default function SiteExperimentsPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [name, setName] = useState("Homepage conversion test");
  const [trafficSplitA, setTrafficSplitA] = useState(50);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (!siteId) return;
    setPagesLoading(true);
    try {
      const [pagesRes, expRes] = await Promise.all([
        fetch(`/api/saas/sites/${siteId}/pages`, { credentials: "include" }),
        fetch(`/api/saas/sites/${siteId}/ab/experiments`, { credentials: "include" }),
      ]);
      if (pagesRes.ok) {
        const data = await pagesRes.json();
        const arr = Array.isArray(data) ? data : [];
        setPages(arr);
        setSelectedPageId((prev) => (!prev && arr[0]?.id ? arr[0].id : prev));
      }
      if (expRes.ok) setExperiments(await expRes.json());
    } finally {
      setPagesLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, load]);

  const createExperiment = async () => {
    const page = pages.find((p) => p.id === selectedPageId);
    if (!page) return;
    const blocksA = Array.isArray(page.draftBlocks) ? page.draftBlocks : [];
    const blocksB = blocksA.map((b) => {
      const block = b as Record<string, unknown>;
      const content = (block.content ?? {}) as Record<string, unknown>;
      return {
        ...block,
        content: {
          ...content,
          subtitle:
            typeof content.subtitle === "string"
              ? `${content.subtitle} - Limited-time offer`
              : "Limited-time offer",
        },
      };
    });
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.id, name, blocksA, blocksB, trafficSplitA, status: "DRAFT" }),
    });
    if (res.ok) {
      setStatus("Experiment created.");
      await load();
    } else {
      setStatus("Failed to create experiment.");
    }
  };

  const updateSplit = async (experimentId: string, nextSplitA: number) => {
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, action: "set_split", trafficSplitA: nextSplitA }),
    });
    if (res.ok) {
      setStatus("Traffic split updated.");
      await load();
    } else {
      setStatus("Failed to update traffic split.");
    }
  };

  const setWinner = async (experimentId: string, winnerVariant: "A" | "B" | null) => {
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, action: "set_winner", winnerVariant }),
    });
    if (res.ok) {
      setStatus(winnerVariant ? `Winner set to ${winnerVariant}.` : "Winner cleared.");
      await load();
    } else {
      setStatus("Failed to update winner.");
    }
  };

  const setExperimentRunning = async (experimentId: string, running: boolean) => {
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, action: running ? "start" : "stop" }),
    });
    if (res.ok) {
      setStatus(running ? "Experiment started." : "Experiment stopped.");
      await load();
    } else {
      setStatus("Failed to update experiment status.");
    }
  };

  const evaluateExperiment = async (experimentId: string) => {
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId }),
    });
    if (res.ok) {
      setStatus("Experiment evaluated.");
      await load();
    } else {
      setStatus("Failed to evaluate experiment.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardPageHeader
          eyebrow="Site builder"
          title="A/B experiments"
          description="Test two block variants per page, adjust traffic split, and pick a winner when sample size is sufficient."
        />
        <Link href={`/dashboard/sites/${siteId}/pages`} className="shrink-0">
          <Button variant="outline">Back to pages</Button>
        </Link>
      </div>

      {pagesLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true" aria-label="Loading pages">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading pages and experiments…
        </div>
      ) : pages.length === 0 ? (
        <DashboardEmptyState
          illustration="layers"
          title="No pages to experiment on"
          description="Create at least one site page before running an A/B test. Variants clone the page's draft blocks."
        >
          <Link href={`/dashboard/sites/${siteId}/pages`}>
            <Button type="button">Open pages</Button>
          </Link>
        </DashboardEmptyState>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-[var(--elevation-1)]">
          <h2 className="text-sm font-semibold text-foreground">Create experiment</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs text-muted-foreground">
              <span className="font-medium">Target page</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              <span className="font-medium">Experiment name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
            </label>
            <div className="rounded-md border border-input px-3 py-2 text-sm text-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Traffic split A / B</span>
                <TooltipHint label="Percentage of visitors who see variant A. The rest see B." side="top">
                  <span className="tabular-nums text-xs font-medium text-foreground">
                    {trafficSplitA} / {100 - trafficSplitA}
                  </span>
                </TooltipHint>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={trafficSplitA}
                onChange={(e) => setTrafficSplitA(Number(e.target.value))}
                className="mt-2 w-full accent-foreground"
                aria-label="Traffic split between variant A and B"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" className="w-full" onClick={() => void createExperiment()}>
                Create A/B test
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Variant B starts as a copy of A with a tweaked hero subtitle so you can iterate in the page editor afterward.
          </p>
        </div>
      )}

      {!pagesLoading && pages.length > 0 && experiments.length === 0 ? (
        <DashboardEmptyState
          illustration="chart"
          title="No experiments yet"
          description="When you create a test, you can start and stop traffic, evaluate significance, and declare a winner."
          className="py-10"
        />
      ) : null}

      <div className="space-y-2">
        {experiments.map((exp) => (
          <div key={exp.id} className="rounded border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{exp.name}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {exp.status} | Winner: {exp.winnerVariant || "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Split: A {exp.trafficSplitA}% / B {exp.trafficSplitB}%
                </p>
                {exp.stats ? (
                  <p className="text-xs text-muted-foreground">
                    Views A/B: {Number(exp.stats.viewsA ?? 0)} / {Number(exp.stats.viewsB ?? 0)} ·
                    CVR A: {Math.round((Number(exp.stats.conversionRateA ?? 0) || 0) * 1000) / 10}% · CVR B:{" "}
                    {Math.round((Number(exp.stats.conversionRateB ?? 0) || 0) * 1000) / 10}% ·
                    p≈{Number(exp.stats.pValueApprox ?? 0).toFixed(3)} ·
                    {exp.stats.significant ? " significant" : " not significant"}
                  </p>
                ) : null}
                {exp.stats && exp.stats.hasEnoughSample === false ? (
                  <p className="text-xs text-amber-700">
                    Guardrail active: need at least {Number(exp.stats.minSamplePerVariant ?? 50)} views per variant before selecting a winner.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => evaluateExperiment(exp.id)}>
                  Evaluate
                </Button>
                <Button variant="outline" onClick={() => setExperimentRunning(exp.id, exp.status !== "RUNNING")}>
                  {exp.status === "RUNNING" ? "Stop" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWinner(exp.id, "A")}
                  disabled={exp.stats?.hasEnoughSample === false}
                >
                  Winner A
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWinner(exp.id, "B")}
                  disabled={exp.stats?.hasEnoughSample === false}
                >
                  Winner B
                </Button>
                <Button variant="outline" onClick={() => setWinner(exp.id, null)}>
                  Clear winner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = exp.trafficSplitA >= 90 ? 50 : exp.trafficSplitA + 10;
                    void updateSplit(exp.id, next);
                  }}
                >
                  +10% A
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {status ? (
        <p className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

