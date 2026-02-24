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
import type { SiteConfigResponse, NavItem } from "@/types/site";
import { DEFAULT_NAV_ITEMS } from "@/app/api/site-config/route";
import { NavItemsEditor } from "@/components/nav-items-editor";

const defaults: SiteConfigResponse = {
  siteName: "My Site",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "",
  metaDescription: null,
  authorName: null,
  links: { email: "", github: "", linkedin: "" },
  navItems: DEFAULT_NAV_ITEMS,
  footerText: null,
  ogImageUrl: null,
  setupCompleted: false,
  templateId: "default",
  themeMode: "system",
  autoAddCustomPagesToNav: true,
};

const STEPS = [
  { id: 1, title: "Site name & meta" },
  { id: 2, title: "Logo & favicon" },
  { id: 3, title: "Navigation" },
  { id: 4, title: "Footer" },
  { id: 5, title: "Complete" },
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
    fetch("/api/site-config")
      .then((r) => r.json())
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
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const completeSetup = () => saveAndGo(true);
  const skipWizard = () => saveAndGo(true);

  if (loading) return <p className="text-slate-600">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">First-time setup</h2>
        <p className="text-slate-600 mt-1">Complete these steps to configure your site. You can change anything later in Site settings.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
              step === s.id ? "bg-slate-900 text-white" : step > s.id ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
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
                <Label htmlFor="siteName">Site name (navbar)</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => setConfig((c) => ({ ...c, siteName: e.target.value }))}
                  placeholder="e.g. Benedict"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Default page title (browser tab)</Label>
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
                <Label>Logo image</Label>
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
                <Label>Favicon (browser tab icon)</Label>
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
              <NavItemsEditor
                items={config.navItems}
                onChange={(navItems) => setConfig((c) => ({ ...c, navItems }))}
                addLabel="Add link"
                helpText="Menu links shown in the header. Drag the handle to reorder. Label is the text, Link is the URL (e.g. /about, /blog)."
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
              <p className="text-slate-600">Review: Site name <strong>{config.siteName}</strong>, {config.navItems.length} nav items. All settings will be saved and you can edit them anytime in <Link href="/dashboard/content/site" className="text-blue-600 underline">Site settings</Link>.</p>
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
