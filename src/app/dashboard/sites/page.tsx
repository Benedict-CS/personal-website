"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformLocaleSwitcher } from "@/components/saas/platform-locale-switcher";
import { usePlatformLocale } from "@/hooks/use-platform-locale";
import { getPlatformMessages } from "@/i18n/messages";
import { DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-ui";

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
  const locale = usePlatformLocale();
  const t = getPlatformMessages(locale);
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
      <DashboardPageHeader eyebrow="Platform" title={t.saasSitesTitle} description={t.saasSitesSubtitle}>
        <PlatformLocaleSwitcher value={locale} label={t.locale} />
      </DashboardPageHeader>

      <DashboardPanel padding="none" className="p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Create New Site</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Site name" />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="site-slug" />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <Button onClick={createSite}>Create Site</Button>
        </div>
        {status ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
      </DashboardPanel>

      <div className="grid gap-3 md:grid-cols-2">
        {sites.map((item) => (
          <DashboardPanel key={item.site.id} padding="none" className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{item.site.name}</h3>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{item.role}</span>
            </div>
            <p className="text-sm text-muted-foreground">Slug: {item.site.slug}</p>
            <p className="text-sm text-muted-foreground">Status: {item.site.status}</p>
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
              <Link href={`/dashboard/sites/${item.site.id}/billing`}>
                <Button variant="outline">{t.billing}</Button>
              </Link>
              <Link href={`/s/${item.site.slug}`}>
                <Button variant="outline">Live Site</Button>
              </Link>
            </div>
          </DashboardPanel>
        ))}
      </div>
    </div>
  );
}

