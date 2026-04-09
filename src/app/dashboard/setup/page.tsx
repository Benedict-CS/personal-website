"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { ImageIcon, ArrowRight, ArrowLeft, Check } from "lucide-react";
import type { SiteConfigResponse } from "@/types/site";
import { DEFAULT_NAV_ITEMS } from "@/lib/site-config-defaults";
import { NavItemsEditor } from "@/components/nav-items-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";

const defaults: SiteConfigResponse = {
  siteName: "My Site",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "",
  metaDescription: null,
  metaKeywords: null,
  authorName: null,
  links: { email: "", github: "", linkedin: "" },
  socialLinks: {},
  navItems: DEFAULT_NAV_ITEMS,
  footerText: null,
  copyrightText: null,
  ogImageUrl: null,
  googleAnalyticsId: null,
  setupCompleted: false,
  templateId: "default",
  themeMode: "light",
  autoAddCustomPagesToNav: true,
  contactEmail: null,
  contactWebhookUrl: null,
  backupRsyncTarget: null,
  backupPostHookUrl: null,
};

const STEPS = [
  { id: 1, title: "Your site name and browser tab title" },
  { id: 2, title: "Logo and small icon (favicon)" },
  { id: 3, title: "Top menu links" },
  { id: 4, title: "Footer: email and social links" },
  { id: 5, title: "You're done" },
] as const;

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<SiteConfigResponse>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPickerFor, setMediaPickerFor] = useState<"logo" | "favicon" | null>(null);

  useEffect(() => {
    fetch("/api/site-config", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load site config");
        return r.json() as Promise<Partial<SiteConfigResponse>>;
      })
      .then((data) => {
        const merged = { ...defaults, ...data };
        if (!Array.isArray(merged.navItems) || merged.navItems.length === 0) merged.navItems = DEFAULT_NAV_ITEMS;
        setConfig(merged);
      })
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, []);


  const saveAndGo = async (markComplete: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, setupCompleted: markComplete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save");
      }
      router.push("/dashboard/analytics");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const completeSetup = () => saveAndGo(true);
  const skipWizard = () => saveAndGo(true);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8" aria-busy="true" aria-label="Loading setup">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <DashboardPageHeader
        eyebrow="Setup"
        title="First-time setup"
        description="A few steps to get your site ready. You can change any of this later in Content → Site settings."
      />

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
              step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                  ? "bg-muted text-foreground"
                  : "bg-muted/60 text-muted-foreground"
            }`}
          >
            {step > s.id ? <Check className="h-4 w-4" /> : null}
            Step {s.id}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="siteName">Site name (what appears in the top bar)</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => setConfig((c) => ({ ...c, siteName: e.target.value }))}
                  placeholder="e.g. Alex"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Browser tab title (what appears in the tab)</Label>
                <Input
                  id="metaTitle"
                  value={config.metaTitle}
                  onChange={(e) => setConfig((c) => ({ ...c, metaTitle: e.target.value }))}
                  placeholder="e.g. John Doe - Developer"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Logo (shown in the top bar next to your site name)</Label>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    value={config.logoUrl ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, logoUrl: e.target.value || null }))}
                    placeholder="URL or choose from Media"
                    className="flex-1 min-w-0"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerFor("logo")}>
                    <ImageIcon className="h-4 w-4 mr-1" /> From Media
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Small icon in the browser tab (favicon)</Label>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    value={config.faviconUrl ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, faviconUrl: e.target.value || null }))}
                    placeholder="URL or choose from Media"
                    className="flex-1 min-w-0"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerFor("favicon")}>
                    <ImageIcon className="h-4 w-4 mr-1" /> From Media
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Add the links that appear in the top menu. Drag the handle to change the order.</p>
              <NavItemsEditor
                items={config.navItems}
                onChange={(navItems) => setConfig((c) => ({ ...c, navItems }))}
                addLabel="Add link"
                helpText="Label = text in the menu. Link = address (e.g. /about for About page, /blog for the blog)."
              />
            </div>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={config.links?.email ?? ""} onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, email: e.target.value } }))} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub URL</Label>
                <Input id="github" value={config.links?.github ?? ""} onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, github: e.target.value } }))} placeholder="https://github.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" value={config.links?.linkedin ?? ""} onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, linkedin: e.target.value } }))} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Footer text (optional)</Label>
                <Textarea id="footerText" value={config.footerText ?? ""} onChange={(e) => setConfig((c) => ({ ...c, footerText: e.target.value || null }))} placeholder="e.g. All rights reserved." rows={2} />
              </div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your site name is <strong className="text-foreground">{config.siteName}</strong> and you have {config.navItems.length}{" "}
                menu links. Everything will be saved; you can change it anytime in{" "}
                <Link href="/dashboard/content/site" className="font-medium text-primary underline underline-offset-2">
                  Site settings
                </Link>{" "}
                or open the{" "}
                <Link href="/editor/home" className="font-medium text-primary underline underline-offset-2">
                  visual editor
                </Link>
                .
              </p>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div>
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={skipWizard} disabled={saving} title="Save current settings and go to dashboard. You can edit everything later in Site settings.">
                  Skip wizard and go to dashboard
                </Button>
              )}
            </div>
            <div>
              {step < 5 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={completeSetup} disabled={saving}>
                  {saving ? "Saving..." : "Complete setup"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <InsertMediaModal open={mediaPickerFor !== null} onClose={() => setMediaPickerFor(null)} onSelect={(url) => { if (mediaPickerFor === "logo") setConfig((c) => ({ ...c, logoUrl: url })); if (mediaPickerFor === "favicon") setConfig((c) => ({ ...c, faviconUrl: url })); setMediaPickerFor(null); }} />
    </div>
  );
}
