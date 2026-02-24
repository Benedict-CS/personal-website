"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { ImageIcon } from "lucide-react";
import type { SiteConfigResponse, NavItem } from "@/types/site";
import { DEFAULT_NAV_ITEMS } from "@/app/api/site-config/route";
import { NavItemsEditor } from "@/components/nav-items-editor";
import { FieldHelp } from "@/components/ui/field-help";

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

export default function SiteSettingsPage() {
  const [config, setConfig] = useState<SiteConfigResponse>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mediaPickerFor, setMediaPickerFor] = useState<"logo" | "favicon" | "og" | null>(null);
  const [customPagesForNav, setCustomPagesForNav] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<SiteConfigResponse>("/api/site-config").then((r) => r.data ?? defaults),
      api.get<{ slug?: string; title?: string; published?: boolean }[]>("/api/custom-pages").then((r) => (Array.isArray(r.data) ? r.data : [])),
    ])
      .then(([data, pages]) => {
        const dataObj = data && typeof data === "object" ? data : defaults;
        const merged = { ...defaults, ...dataObj };
        if (!Array.isArray(merged.navItems) || merged.navItems.length === 0) merged.navItems = [...DEFAULT_NAV_ITEMS];
        if (merged.autoAddCustomPagesToNav !== false) {
          const list = Array.isArray(pages) ? pages : [];
          const existingHrefs = new Set(merged.navItems.map((n: NavItem) => n.href));
          for (const p of list) {
            if (p.published === false) continue;
            const href = `/page/${String(p.slug ?? "").trim()}`;
            if (href !== "/page/" && !existingHrefs.has(href)) {
              merged.navItems = [...merged.navItems, { label: String(p.title ?? p.slug ?? ""), href }];
              existingHrefs.add(href);
            }
          }
        }
        setConfig(merged);
        const list = Array.isArray(pages) ? pages : [];
        setCustomPagesForNav(list.map((p: { slug?: string; title?: string }) => ({ slug: String(p.slug ?? ""), title: String(p.title ?? "") })).filter((p) => p.slug));
      })
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = typeof data?.error === "string" ? data.error : "Failed to save";
        throw new Error(errMsg);
      }
      setMessage({ type: "success", text: "Saved. Refresh the public site (or open it in a new tab) to see navbar, footer, and meta changes." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (mediaPickerFor === "logo") setConfig((c) => ({ ...c, logoUrl: url }));
    if (mediaPickerFor === "favicon") setConfig((c) => ({ ...c, faviconUrl: url }));
    if (mediaPickerFor === "og") setConfig((c) => ({ ...c, ogImageUrl: url }));
    setMediaPickerFor(null);
  };

  if (loading) return <p className="text-slate-600">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Site settings</h2>
        <p className="mt-1 text-slate-600">Site name, favicon, logo, meta, navigation, footer, and OG image. All visible on the site.</p>
      </div>

      {!config.setupCompleted && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg">First-time setup</CardTitle>
            <p className="text-sm font-normal text-slate-600">Use the step-by-step wizard or fill this page and mark complete.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/dashboard/setup">
              <Button variant="outline">Open setup wizard (Step 1 → 5)</Button>
            </Link>
            <Button
              onClick={async () => {
                setSaving(true);
                try {
                  await fetch("/api/site-config", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...config, setupCompleted: true }),
                  });
                  setConfig((c) => ({ ...c, setupCompleted: true }));
                  setMessage({ type: "success", text: "Setup marked complete." });
                } catch {
                  setMessage({ type: "error", text: "Failed to update." });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Mark setup as complete
            </Button>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle>Branding & meta</CardTitle>
          <p className="text-sm font-normal text-slate-500">Navbar name, logo, favicon, browser tab title.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="siteName">Site name (navbar)</Label>
              <FieldHelp text="The name shown in the top bar of your site and as the main site title. Keep it short." />
            </div>
            <Input
              id="siteName"
              value={config.siteName}
              onChange={(e) => setConfig((c) => ({ ...c, siteName: e.target.value }))}
              placeholder="e.g. Benedict"
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Default page title (browser tab)</Label>
            <Input
              id="metaTitle"
              value={config.metaTitle}
              onChange={(e) => setConfig((c) => ({ ...c, metaTitle: e.target.value }))}
              placeholder="e.g. John Doe - Developer"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="metaDescription">Default meta description (optional)</Label>
              <FieldHelp text="Short text for search engines (Google, etc.). Shown in search results. Leave empty to use site name." />
            </div>
            <Textarea
              id="metaDescription"
              value={config.metaDescription ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, metaDescription: e.target.value || null }))}
              placeholder="Short description for search engines"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authorName">Author name (footer © line)</Label>
            <Input
              id="authorName"
              value={config.authorName ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, authorName: e.target.value || null }))}
              placeholder="e.g. Benedict Tiong"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Navigation (navbar links)</CardTitle>
            <FieldHelp text="Label = text shown in the menu. Link = web address: use /about for About page, /blog for the blog. Start with / for pages on your site." />
          </div>
          <p className="text-sm font-normal text-slate-500">Order and labels for Home, About, Blog, Contact. When enabled, custom pages are auto-added to the end of this list.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoAddCustomPagesToNav !== false}
              onChange={(e) => setConfig((c) => ({ ...c, autoAddCustomPagesToNav: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Auto-add custom pages to navigation</span>
          </label>
          <NavItemsEditor
            items={config.navItems}
            onChange={(navItems) => setConfig((c) => ({ ...c, navItems }))}
            addLabel="Add link"
            helpText="Drag the handle to reorder. Label = text in menu, Link = URL (e.g. /about, /blog)."
          />
          {config.autoAddCustomPagesToNav !== false && customPagesForNav.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">Custom pages are merged into the list above when auto-add is ON. Reorder or remove as needed, then Save.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer links</CardTitle>
          <p className="text-sm font-normal text-slate-500">Email, GitHub, LinkedIn icons in the footer.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={config.links?.email ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, email: e.target.value } }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">GitHub URL</Label>
            <Input
              id="github"
              value={config.links?.github ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, github: e.target.value } }))}
              placeholder="https://github.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              value={config.links?.linkedin ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, links: { ...c.links, linkedin: e.target.value } }))}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer text (optional)</Label>
            <Textarea
              id="footerText"
              value={config.footerText ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, footerText: e.target.value || null }))}
              placeholder="e.g. All rights reserved. Or a second line."
              rows={2}
            />
            <p className="text-xs text-slate-500">Shown below the © line. Leave empty for default &quot;All rights reserved.&quot;</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>OG image (social share)</CardTitle>
            <FieldHelp text="Image shown when someone shares your site on Facebook, Twitter, etc. Use a square or 1200×630 image for best results. Optional." />
          </div>
          <p className="text-sm font-normal text-slate-500">Image when sharing the site on social media.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Input
              value={config.ogImageUrl ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, ogImageUrl: e.target.value || null }))}
              placeholder="URL or choose from Media"
              className="flex-1 min-w-0"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerFor("og")}>
              <ImageIcon className="h-4 w-4 mr-1" /> From Media
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>}
      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>

      <InsertMediaModal
        open={mediaPickerFor !== null}
        onClose={() => setMediaPickerFor(null)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
