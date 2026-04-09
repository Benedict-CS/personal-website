"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PageRecord = { id: string; title: string; slug: string; draftBlocks: unknown[] };
type Experiment = {
  id: string;
  name: string;
  status: string;
  winnerVariant: string | null;
  variants: Array<{ id: string; key: string; title: string }>;
};

export default function SiteExperimentsPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [name, setName] = useState("Homepage conversion test");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [pagesRes, expRes] = await Promise.all([
      fetch(`/api/saas/sites/${siteId}/pages`),
      fetch(`/api/saas/sites/${siteId}/ab/experiments`),
    ]);
    if (pagesRes.ok) {
      const data = await pagesRes.json();
      const arr = Array.isArray(data) ? data : [];
      setPages(arr);
      if (!selectedPageId && arr[0]?.id) setSelectedPageId(arr[0].id);
    }
    if (expRes.ok) setExperiments(await expRes.json());
  }, [selectedPageId, siteId]);

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.id, name, blocksA, blocksB }),
    });
    if (res.ok) {
      setStatus("Experiment created.");
      await load();
    } else {
      setStatus("Failed to create experiment.");
    }
  };

  const evaluateExperiment = async (experimentId: string) => {
    const res = await fetch(`/api/saas/sites/${siteId}/ab/experiments`, {
      method: "PATCH",
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">A/B Testing Engine</h1>
          <p className="text-muted-foreground">Create variants, route traffic, and evaluate statistical significance.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>

      <div className="rounded border border-border bg-card p-4 space-y-2">
        <h2 className="font-semibold">Create Experiment</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded border border-input px-3 py-2"
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={createExperiment}>Create A/B Test</Button>
        </div>
      </div>

      <div className="space-y-2">
        {experiments.map((exp) => (
          <div key={exp.id} className="rounded border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{exp.name}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {exp.status} | Winner: {exp.winnerVariant || "-"}
                </p>
              </div>
              <Button variant="outline" onClick={() => evaluateExperiment(exp.id)}>
                Evaluate
              </Button>
            </div>
          </div>
        ))}
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

