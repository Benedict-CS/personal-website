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
import { Download, ImageIcon, Loader2 } from "lucide-react";
import type { SiteConfigResponse, NavItem } from "@/types/site";
import { DEFAULT_NAV_ITEMS } from "@/lib/site-config-defaults";
import { NavItemsEditor } from "@/components/nav-items-editor";
import { FieldHelp } from "@/components/ui/field-help";
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

export default function SiteSettingsPage() {
  const [config, setConfig] = useState<SiteConfigResponse>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mediaPickerFor, setMediaPickerFor] = useState<"logo" | "favicon" | "og" | null>(null);
  const [customPagesForNav, setCustomPagesForNav] = useState<{ slug: string; title: string }[]>([]);
  const [exportingTarget, setExportingTarget] = useState<"posts" | "system" | null>(null);

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
        credentials: "include",
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

  const exportData = async (target: "posts" | "system") => {
    setExportingTarget(target);
    setMessage(null);
    try {
      const response = await fetch(`/api/data-liberation/export?target=${target}`, { method: "GET" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Export failed");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        target === "posts"
          ? `cms-posts-${new Date().toISOString().slice(0, 10)}.zip`
          : `cms-system-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setMessage({ type: "success", text: `Exported ${target} data.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Export failed." });
    } finally {
      setExportingTarget(null);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (mediaPickerFor === "logo") setConfig((c) => ({ ...c, logoUrl: url }));
    if (mediaPickerFor === "favicon") setConfig((c) => ({ ...c, faviconUrl: url }));
    if (mediaPickerFor === "og") setConfig((c) => ({ ...c, ogImageUrl: url }));
    setMediaPickerFor(null);
  };

  const applyTemplate = async (preset: "personal" | "portfolio" | "blog") => {
    const templates = {
      personal: {
        navItems: [
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Blog", href: "/blog" },
          { label: "Contact", href: "/contact" },
        ],
        templateId: "default" as const,
        sectionOrder: ["hero", "latestPosts", "skills"],
      },
      portfolio: {
        navItems: [
          { label: "Home", href: "/" },
          { label: "Portfolio", href: "/page/portfolio" },
          { label: "About", href: "/about" },
          { label: "Blog", href: "/blog" },
          { label: "Contact", href: "/contact" },
        ],
        templateId: "card" as const,
        sectionOrder: ["hero", "latestPosts", "skills"],
      },
      blog: {
        navItems: [
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
        templateId: "minimal" as const,
        sectionOrder: ["hero", "latestPosts", "skills"],
      },
    };
    const t = templates[preset];
    setSaving(true);
    setMessage(null);
    try {
      await fetch("/api/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...config, navItems: t.navItems, templateId: t.templateId }),
      });
      const homeRes = await fetch("/api/site-content?page=home", { credentials: "include" });
      const currentHome = homeRes.ok ? await homeRes.json().catch(() => ({})) : {};
      const homeContent = typeof currentHome === "object" && currentHome !== null
        ? { ...currentHome, sectionOrder: t.sectionOrder, sectionVisibility: {} }
        : { sectionOrder: t.sectionOrder, sectionVisibility: {} };
      await fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ page: "home", content: homeContent }),
      });
      setConfig((c) => ({ ...c, navItems: t.navItems, templateId: t.templateId }));
      setMessage({ type: "success", text: `Applied "${preset}" template. Nav and home sections updated.` });
    } catch {
      setMessage({ type: "error", text: "Failed to apply template." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-56 rounded-lg skeleton-shimmer" />
        <div className="h-5 w-full max-w-md rounded-lg skeleton-shimmer" />
        <div className="rounded-xl border border-border p-6 shadow-[var(--elevation-1)] space-y-4">
          <div className="h-6 w-40 rounded-lg skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
        </div>
        <div className="rounded-xl border border-border p-6 shadow-[var(--elevation-1)] space-y-4">
          <div className="h-6 w-48 rounded-lg skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          <div className="h-10 w-2/3 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const siteUrl = typeof process.env.NEXT_PUBLIC_SITE_URL === "string" ? process.env.NEXT_PUBLIC_SITE_URL : null;

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Site"
        title="Site settings"
        description="Site name, favicon, logo, meta, navigation, footer, and OG image. All visible on the site."
      >
        {siteUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer">
              View site
            </a>
          </Button>
        ) : null}
      </DashboardPageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <p className="text-sm text-muted-foreground">One-click apply: set navigation and layout style. You can still edit everything after.</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => applyTemplate("personal")} disabled={saving}>
            Personal
          </Button>
          <Button variant="outline" onClick={() => applyTemplate("portfolio")} disabled={saving}>
            Portfolio
          </Button>
          <Button variant="outline" onClick={() => applyTemplate("blog")} disabled={saving}>
            Blog
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom pages</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Custom pages are managed in a dedicated screen so they stay separate from core site settings.</p>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Create, publish, reorder, and edit custom pages from one place.</p>
          <Link href="/dashboard/content/pages">
            <Button variant="outline">Open custom pages</Button>
          </Link>
        </CardContent>
      </Card>

      {!config.setupCompleted && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg">First-time setup</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">Use the step-by-step wizard or fill this page and mark complete.</p>
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
          <p className="text-sm font-normal text-muted-foreground">Navbar name, logo, favicon, browser tab title.</p>
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
              placeholder="e.g. Alex"
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
            <div className="flex items-center gap-2">
              <Label htmlFor="metaKeywords">Default meta keywords (optional)</Label>
              <FieldHelp text="Comma-separated terms for your niche or personal brand (e.g. machine learning, open source, Taiwan). Used only in the root layout; blog posts keep their own SEO fields." />
            </div>
            <Input
              id="metaKeywords"
              value={config.metaKeywords ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, metaKeywords: e.target.value.trim() ? e.target.value : null }))}
              placeholder="e.g. software engineering, blog, your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authorName">Author name (footer © line)</Label>
            <Input
              id="authorName"
              value={config.authorName ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, authorName: e.target.value || null }))}
              placeholder="e.g. Alex Johnson"
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
          <p className="text-sm font-normal text-muted-foreground">Core pages should stay explicit: Home, About, Blog (Posts), Contact. Custom pages are additional items and can be appended automatically.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoAddCustomPagesToNav !== false}
              onChange={(e) => setConfig((c) => ({ ...c, autoAddCustomPagesToNav: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">Auto-add custom pages to navigation</span>
          </label>
          <NavItemsEditor
            items={config.navItems}
            onChange={(navItems) => setConfig((c) => ({ ...c, navItems }))}
            addLabel="Add link"
            helpText="Drag the handle to reorder. Label = text in menu, Link = URL (e.g. /about, /blog)."
          />
          {config.autoAddCustomPagesToNav !== false && customPagesForNav.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Custom pages are merged into the list above when auto-add is ON. Reorder or remove as needed, then Save.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact form & webhooks</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Messages are sent to the recipient email. Optionally POST a JSON payload to a custom HTTPS URL (Discord incoming
            webhook, Telegram bot API, LINE Notify bridge, or your own worker).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Recipient email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={config.contactEmail ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, contactEmail: e.target.value.trim() || null }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactWebhookUrl">Webhook URL (optional)</Label>
            <Input
              id="contactWebhookUrl"
              value={config.contactWebhookUrl ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, contactWebhookUrl: e.target.value.trim() || null }))}
              placeholder="https://discord.com/api/webhooks/…"
            />
            <p className="text-xs text-muted-foreground">
              Payload: <code className="rounded bg-muted px-1 text-foreground">event</code> ={" "}
              <code className="rounded bg-muted px-1">contact.form_submitted</code>, plus{" "}
              <code className="rounded bg-muted px-1">data</code> with name, email, subject, message, and{" "}
              <code className="rounded bg-muted px-1">submittedAt</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup targets</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Used by <code className="rounded bg-muted px-1 text-foreground">scripts/backup-data.sh</code> when the
            corresponding environment variables are set, or values are synced here for documentation. Rsync pushes the archive;
            post-hook notifies your NAS or automation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backupRsyncTarget">Rsync destination (optional)</Label>
            <Input
              id="backupRsyncTarget"
              value={config.backupRsyncTarget ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, backupRsyncTarget: e.target.value.trim() || null }))}
              placeholder="user@nas.local::backups/site/"
            />
            <p className="text-xs text-muted-foreground">
              Also set <code className="rounded bg-muted px-1">BACKUP_RSYNC_TARGET</code> on the server to match, or export
              it before running the backup script.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backupPostHookUrl">Post-backup webhook (optional)</Label>
            <Input
              id="backupPostHookUrl"
              value={config.backupPostHookUrl ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, backupPostHookUrl: e.target.value.trim() || null }))}
              placeholder="https://nas.example.com/hooks/backup-done"
            />
            <p className="text-xs text-muted-foreground">
              Script POSTs JSON when an archive is created. Set <code className="rounded bg-muted px-1">BACKUP_POST_HOOK_URL</code>{" "}
              in the server environment for automation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Liberation</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Export content and platform data in portable formats. Posts export as MDX files with frontmatter in a ZIP archive.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={exportingTarget !== null}
              onClick={() => void exportData("posts")}
            >
              {exportingTarget === "posts" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export posts ZIP
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={exportingTarget !== null}
              onClick={() => void exportData("system")}
            >
              {exportingTarget === "system" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export system JSON
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            System export includes site configuration, editable page content, custom pages, and analytics records.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Copyright</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Shown in the footer. Use {"{year}"} for the current year.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            id="copyrightText"
            value={config.copyrightText ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, copyrightText: e.target.value.trim() || null }))}
            placeholder="e.g. © {year} Company Name. All rights reserved."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links (footer)</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">URLs for social icons in the footer. Leave empty to hide.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["twitter", "instagram", "linkedin", "github", "youtube"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`social-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)} URL</Label>
              <Input
                id={`social-${key}`}
                value={config.socialLinks?.[key] ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    socialLinks: { ...c.socialLinks, [key]: e.target.value.trim() || "" },
                  }))
                }
                placeholder={key === "youtube" ? "https://youtube.com/..." : `https://${key}.com/...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Analytics</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Optional. Enter a GA4 Measurement ID (e.g. G-XXXXXXXXXX) to enable Google Analytics on all pages.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            id="googleAnalyticsId"
            value={config.googleAnalyticsId ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, googleAnalyticsId: e.target.value.trim() || null }))}
            placeholder="G-XXXXXXXXXX"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer links</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Email, GitHub, LinkedIn icons in the footer.</p>
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
            <p className="text-xs text-muted-foreground">Shown below the © line. Leave empty for default &quot;All rights reserved.&quot;</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discovery &amp; CDN</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Search engines and edge networks use your public URLs. Submit the sitemap in{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline font-medium"
            >
              Google Search Console
            </a>{" "}
            (property → Sitemaps → add URL below). Use a CDN (e.g. Cloudflare) in front of your domain to cache static assets, sitemap, and filter abusive traffic.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {siteUrl ? (
            <>
              <p>
                <span className="text-muted-foreground">Sitemap: </span>
                <a
                  href={`${siteUrl.replace(/\/$/, "")}/sitemap.xml`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all"
                >
                  {`${siteUrl.replace(/\/$/, "")}/sitemap.xml`}
                </a>
              </p>
              <p className="text-xs text-muted-foreground">
                Rate limiting for the contact form and admin login uses <code className="rounded bg-muted px-1">REDIS_URL</code> when set (shared across server instances).
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_SITE_URL</code> to show your sitemap link here.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>OG image (social share)</CardTitle>
            <FieldHelp text="Image shown when someone shares your site on Facebook, Twitter, etc. Use a square or 1200×630 image for best results. Optional." />
          </div>
          <p className="text-sm font-normal text-muted-foreground">Image when sharing the site on social media.</p>
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

      {message && (
        <p role="status" aria-live="polite" className={message.type === "success" ? "text-green-600" : "text-red-600"}>
          {message.text}
          {message.type === "success" && typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && (
            <> — <a href={process.env.NEXT_PUBLIC_SITE_URL} className="underline">View on site</a></>
          )}
        </p>
      )}
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
