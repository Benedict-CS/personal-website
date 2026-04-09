"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SitePlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-ui";

type BillingPayload = {
  plan: SitePlan;
  status: string;
  billingProvider: string;
  limits: { maxPages: number; maxProducts: number; maxVectorDocuments: number };
  usage: { pages: number; products: number; vectorDocuments: number };
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const PAID: SitePlan[] = ["PRO", "BUSINESS", "ENTERPRISE"];

export default function SiteBillingPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [data, setData] = useState<BillingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/saas/sites/${encodeURIComponent(siteId)}/billing`, {
      credentials: "include",
    });
    if (!res.ok) {
      setError("Failed to load billing.");
      return;
    }
    setData(await res.json());
    setError(null);
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCheckout = async (targetPlan: SitePlan) => {
    if (!siteId) return;
    setBusy(targetPlan);
    try {
      const res = await fetch("/api/saas/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, targetPlan, provider: "stripe" }),
      });
      const json = (await res.json()) as { url?: string; error?: string; hint?: string };
      if (!res.ok) {
        setError(json.error ?? json.hint ?? "Checkout failed");
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError("No checkout URL returned");
    } finally {
      setBusy(null);
    }
  };

  if (!siteId) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!data) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">Loading billing…</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DashboardPageHeader
        eyebrow="Billing"
        title="Billing & plan"
        description={
          <>
            Site <span className="font-mono text-sm">{siteId}</span> — provider{" "}
            <span className="font-mono">{data.billingProvider}</span>
          </>
        }
      >
        <Link href="/dashboard/sites">
          <Button variant="outline">All sites</Button>
        </Link>
      </DashboardPageHeader>

      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <DashboardPanel padding="none" className="p-4">
        <h2 className="mb-2 font-semibold text-foreground">Current subscription</h2>
        <p className="text-foreground/90">
          Plan: <strong>{data.plan}</strong> — Status: <strong>{data.status}</strong>
        </p>
        {data.currentPeriodEnd ? (
          <p className="text-sm text-muted-foreground">
            Current period ends: {new Date(data.currentPeriodEnd).toLocaleString()}
            {data.cancelAtPeriodEnd ? " (cancels at period end)" : ""}
          </p>
        ) : null}
      </DashboardPanel>

      <DashboardPanel padding="none" className="p-4">
        <h2 className="mb-3 font-semibold text-foreground">Usage vs limits</h2>
        <ul className="space-y-2 text-sm text-foreground/90">
          <li>
            Pages: {data.usage.pages} / {data.limits.maxPages}
          </li>
          <li>
            Products: {data.usage.products} / {data.limits.maxProducts}
          </li>
          <li>
            Vector documents: {data.usage.vectorDocuments} / {data.limits.maxVectorDocuments}
          </li>
        </ul>
      </DashboardPanel>

      <DashboardPanel padding="none" className="p-4">
        <h2 className="mb-3 font-semibold text-foreground">Upgrade (Stripe Checkout)</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Requires <code className="rounded bg-muted px-1 font-mono text-xs">STRIPE_SECRET_KEY</code> and price IDs in the environment.
        </p>
        <div className="flex flex-wrap gap-2">
          {PAID.map((plan) => (
            <Button
              key={plan}
              type="button"
              disabled={busy !== null || data.plan === plan}
              onClick={() => void startCheckout(plan)}
            >
              {busy === plan ? "Redirecting…" : `Upgrade to ${plan}`}
            </Button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}
