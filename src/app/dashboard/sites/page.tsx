"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SiteSummary = {
  accountId: string;
  role: string;
  site: {
    id: string;
    name: string;
    slug: string;
    status: "DRAFT" | "ACTIVE" | "SUSPENDED";
    updatedAt: string;
  };
};

const TEMPLATE_OPTIONS = [
  { key: "corporate", label: "Corporate" },
  { key: "creative-portfolio", label: "Creative Portfolio" },
  { key: "tech-blog", label: "Tech Blog" },
  { key: "restaurant", label: "Restaurant" },
  { key: "local-business", label: "Local Business" },
];

export default function DashboardSitesPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [templateKey, setTemplateKey] = useState("corporate");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/saas/sites");
    if (!res.ok) return;
    setSites(await res.json());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createSite = async () => {
    const res = await fetch("/api/saas/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        templateKey,
      }),
    });
    if (res.ok) {
      setName("");
      setSlug("");
      setStatus("Site created.");
      await load();
    } else {
      setStatus("Failed to create site.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Multi-tenant SaaS Sites</h1>
        <p className="text-slate-600">Create and manage isolated tenant websites with template onboarding.</p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Create New Site</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Site name" />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="site-slug" />
          <select
            className="rounded border border-slate-300 px-3 py-2"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <Button onClick={createSite}>Create Site</Button>
        </div>
        {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sites.map((item) => (
          <div key={item.site.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{item.site.name}</h3>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs">{item.role}</span>
            </div>
            <p className="text-sm text-slate-600">Slug: {item.site.slug}</p>
            <p className="text-sm text-slate-600">Status: {item.site.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/dashboard/sites/${item.site.id}/pages`}>
                <Button variant="outline">Pages</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/media`}>
                <Button variant="outline">Media</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/commerce`}>
                <Button variant="outline">Commerce</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/ai`}>
                <Button variant="outline">AI Copilot</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/infra`}>
                <Button variant="outline">Infrastructure</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/showroom`}>
                <Button variant="outline">3D Showroom</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/crm`}>
                <Button variant="outline">CRM</Button>
              </Link>
              <Link href={`/dashboard/sites/${item.site.id}/experiments`}>
                <Button variant="outline">Experiments</Button>
              </Link>
              <Link href={`/s/${item.site.slug}`}>
                <Button variant="outline">Live Site</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

