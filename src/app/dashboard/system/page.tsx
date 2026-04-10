"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import {
  Loader2,
  RefreshCw,
  Database,
  ShieldAlert,
  Trash2,
  Link2,
  Rss,
  Globe,
  HardDriveUpload,
  Workflow,
  Download,
  Eye,
} from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { TooltipHint } from "@/components/ui/tooltip-hint";
import { DASHBOARD_INTERNAL_FETCH, fetchWithRetry, formatDashboardFetchFailure } from "@/lib/self-healing-fetch";

const dashboardMutationFetch = { ...DASHBOARD_INTERNAL_FETCH, retries: 0 };
const backupTriggerFetch = { ...DASHBOARD_INTERNAL_FETCH, retries: 0, timeoutMs: 120000 };

type HealthResponse = {
  ok: boolean;
  latencyMs?: number;
  databaseEngine?: "sqlite" | "postgres" | "unknown";
  error?: string;
};

type MediaUsageResponse = {
  total: number;
  usedCount: number;
  unusedCount: number;
  unusedFiles: string[];
};

type LinkCheckIssue = {
  sourceType: "post" | "custom-page";
  sourceId: string;
  sourceLabel: string;
  href: string;
  normalizedPath: string;
};

type LinkCheckResponse = {
  ok: boolean;
  scannedDocuments: number;
  scannedLinks: number;
  brokenCount: number;
  brokenLinks: LinkCheckIssue[];
  error?: string;
};

type LinkCheckHistoryItem = {
  id: string;
  createdAt: string;
  scannedDocuments: number;
  scannedLinks: number;
  brokenCount: number;
};

type SeoIntegrityResponse = {
  ok: boolean;
  scannedAt: string;
  checks: {
    rss: { status: number; itemCount: number; hasAtomSelfLink: boolean; issues: Array<{ level: string; message: string }> };
    sitemap: {
      status: number;
      urlCount: number;
      hasHomeUrl: boolean;
      hasBlogUrl: boolean;
      issues: Array<{ level: string; message: string }>;
    };
    robots: { status: number; hasSitemapDeclaration: boolean };
    securityTxt: { status: number; hasContact: boolean };
  };
};

type WorkflowHealthResponse = {
  ok: boolean;
  windowDays: number;
  submissionsLast7d: number;
  deliveredLast7d: number;
  failedLast7d: number;
  failureRate: number;
  webhookConfigured: boolean;
  recentFailures: Array<{ id: string; createdAt: string; details: string | null }>;
  error?: string;
};

export default function DashboardSystemPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [mediaUsage, setMediaUsage] = useState<MediaUsageResponse | null>(null);
  const [scanningMedia, setScanningMedia] = useState(false);
  const [cleaningMedia, setCleaningMedia] = useState(false);
  const [optimizingDb, setOptimizingDb] = useState(false);
  const [linkCheck, setLinkCheck] = useState<LinkCheckResponse | null>(null);
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [linkCheckHistory, setLinkCheckHistory] = useState<LinkCheckHistoryItem[]>([]);
  const [mediaCleanupConfirmOpen, setMediaCleanupConfirmOpen] = useState(false);
  const [mediaDryRunLoading, setMediaDryRunLoading] = useState(false);
  const [mediaDryRun, setMediaDryRun] = useState<{
    unusedCount: number;
    unusedFiles: string[];
  } | null>(null);
  const [seoIntegrity, setSeoIntegrity] = useState<SeoIntegrityResponse | null>(null);
  const [checkingSeoIntegrity, setCheckingSeoIntegrity] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [workflowHealth, setWorkflowHealth] = useState<WorkflowHealthResponse | null>(null);
  const [loadingWorkflowHealth, setLoadingWorkflowHealth] = useState(false);

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const response = await fetchWithRetry("/api/system/maintenance", { method: "GET" }, DASHBOARD_INTERNAL_FETCH);
      const data = (await response.json().catch(() => ({}))) as HealthResponse;
      if (!response.ok) throw new Error(data.error || "Health check failed");
      setHealth(data);
      toast("Health check completed.", "success");
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setCheckingHealth(false);
    }
  };

  const scanOrphanedMedia = async () => {
    setScanningMedia(true);
    try {
      const response = await fetchWithRetry("/api/media/usage", { method: "GET" }, DASHBOARD_INTERNAL_FETCH);
      const data = (await response.json().catch(() => ({}))) as MediaUsageResponse;
      if (!response.ok) throw new Error("Failed to scan media usage");
      setMediaUsage(data);
      toast("Media usage scan completed.", "success");
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setScanningMedia(false);
    }
  };

  const runMediaCleanupDryRun = async () => {
    setMediaDryRunLoading(true);
    setMediaDryRun(null);
    try {
      const response = await fetchWithRetry(
        "/api/media/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true }),
        },
        dashboardMutationFetch,
      );
      const data = (await response.json().catch(() => ({}))) as {
        unusedCount?: number;
        unusedFiles?: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Dry run failed");
      setMediaDryRun({
        unusedCount: data.unusedCount ?? 0,
        unusedFiles: Array.isArray(data.unusedFiles) ? data.unusedFiles : [],
      });
      toast(`Dry run: ${data.unusedCount ?? 0} file(s) would be removed.`, "success");
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setMediaDryRunLoading(false);
    }
  };

  const cleanupOrphanedMedia = async () => {
    setCleaningMedia(true);
    try {
      const response = await fetchWithRetry(
        "/api/media/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: false }),
        },
        dashboardMutationFetch,
      );
      const data = (await response.json().catch(() => ({}))) as { deletedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "Cleanup failed");
      toast(`Deleted ${data.deletedCount ?? 0} orphaned file(s).`, "success");
      setMediaCleanupConfirmOpen(false);
      setMediaDryRun(null);
      await scanOrphanedMedia();
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setCleaningMedia(false);
    }
  };

  const optimizeDatabase = async () => {
    setOptimizingDb(true);
    try {
      const response = await fetchWithRetry(
        "/api/system/maintenance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "optimize-db" }),
        },
        dashboardMutationFetch,
      );
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; operation?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Database maintenance failed");
      toast(`Database maintenance finished (${data.operation ?? "done"}).`, "success");
      await runHealthCheck();
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setOptimizingDb(false);
    }
  };

  const downloadBrokenLinksCsv = () => {
    if (!linkCheck || linkCheck.brokenLinks.length === 0) return;
    const header = "sourceType,sourceId,sourceLabel,href,normalizedPath\n";
    const rows = linkCheck.brokenLinks.map((issue) =>
      [issue.sourceType, issue.sourceId, `"${(issue.sourceLabel || "").replace(/"/g, '""')}"`, issue.href, issue.normalizedPath]
        .map((cell) => String(cell))
        .join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broken-links-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runLinkCheck = async () => {
    setCheckingLinks(true);
    try {
      const response = await fetchWithRetry("/api/system/link-check", { method: "POST" }, dashboardMutationFetch);
      const data = (await response.json().catch(() => ({}))) as LinkCheckResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to scan links.");
      }
      setLinkCheck(data);
      void loadLinkCheckHistory();
      toast(`Link check finished. ${data.brokenCount} broken link(s) found.`, data.brokenCount > 0 ? "warning" : "success");
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setCheckingLinks(false);
    }
  };

  const loadLinkCheckHistory = useCallback(async () => {
    try {
      const response = await fetchWithRetry("/api/system/link-check", { method: "GET" }, DASHBOARD_INTERNAL_FETCH);
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        history?: LinkCheckHistoryItem[];
      };
      if (!response.ok || !data.ok) return;
      setLinkCheckHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      // Keep history empty on request errors.
    }
  }, []);

  useEffect(() => {
    void loadLinkCheckHistory();
  }, [loadLinkCheckHistory]);

  const runSeoIntegrityScan = async () => {
    setCheckingSeoIntegrity(true);
    try {
      const response = await fetchWithRetry("/api/system/seo-integrity", { method: "GET" }, DASHBOARD_INTERNAL_FETCH);
      const data = (await response.json().catch(() => ({}))) as SeoIntegrityResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "SEO integrity scan failed");
      setSeoIntegrity(data);
      toast(data.ok ? "SEO integrity scan passed." : "SEO integrity scan found issues.", data.ok ? "success" : "warning");
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setCheckingSeoIntegrity(false);
    }
  };

  const triggerBackupSnapshot = async () => {
    setTriggeringBackup(true);
    setBackupMessage(null);
    try {
      const response = await fetchWithRetry("/api/backup/trigger", { method: "POST" }, backupTriggerFetch);
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        ran?: boolean;
        message?: string;
        exitCode?: number;
        error?: string;
      };
      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "Backup trigger failed");
      }
      if (data.ran === false) {
        const msg = data.message || "Server backup trigger is disabled.";
        setBackupMessage(msg);
        toast(msg, "warning");
        return;
      }
      const msg = `Backup finished successfully (exit code ${data.exitCode ?? 0}).`;
      setBackupMessage(msg);
      toast(msg, "success");
    } catch (error) {
      const msg = formatDashboardFetchFailure(error);
      setBackupMessage(msg);
      toast(msg, "error");
    } finally {
      setTriggeringBackup(false);
    }
  };

  const loadWorkflowHealth = useCallback(async () => {
    setLoadingWorkflowHealth(true);
    try {
      const response = await fetchWithRetry("/api/system/workflow-health", { method: "GET" }, DASHBOARD_INTERNAL_FETCH);
      const data = (await response.json().catch(() => ({}))) as WorkflowHealthResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load workflow health.");
      }
      setWorkflowHealth(data);
    } catch (error) {
      toast(formatDashboardFetchFailure(error), "error");
    } finally {
      setLoadingWorkflowHealth(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadWorkflowHealth();
  }, [loadWorkflowHealth]);

  const lastLinkScan = linkCheckHistory[0];
  const staleBrokenFromHistory = !linkCheck && lastLinkScan && lastLinkScan.brokenCount > 0;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={mediaCleanupConfirmOpen}
        onClose={() => setMediaCleanupConfirmOpen(false)}
        title="Delete orphaned media files?"
        description="This permanently removes objects from storage that are not referenced by posts, site settings, or About assets. This cannot be undone."
        confirmLabel="Delete files"
        variant="danger"
        loading={cleaningMedia}
        onConfirm={() => void cleanupOrphanedMedia()}
      />
      <DashboardPageHeader
        eyebrow="System"
        title="System Health & Maintenance"
        description="Monitor runtime health, inspect orphaned media, and run database maintenance tasks."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Database connection health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipHint label="Checks DB connectivity and reports latency">
            <Button onClick={() => void runHealthCheck()} disabled={checkingHealth} className="gap-2">
              {checkingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run health check
            </Button>
          </TooltipHint>
          {health ? (
            <p className="text-sm text-muted-foreground">
              Engine: <span className="font-medium text-foreground">{health.databaseEngine ?? "unknown"}</span> · Latency:{" "}
              <span className="font-medium text-foreground">{health.latencyMs ?? 0} ms</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Orphaned media cleanup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <TooltipHint label="Find files not referenced by any post or page">
              <Button variant="outline" onClick={() => void scanOrphanedMedia()} disabled={scanningMedia} className="gap-2">
                {scanningMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Scan references
              </Button>
            </TooltipHint>
            <TooltipHint label="Calls cleanup API with dryRun only — no deletions">
              <Button
                variant="outline"
                onClick={() => void runMediaCleanupDryRun()}
                disabled={mediaDryRunLoading}
                className="gap-2"
              >
                {mediaDryRunLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview cleanup (dry run)
              </Button>
            </TooltipHint>
            <Button
              variant="destructive"
              onClick={() => setMediaCleanupConfirmOpen(true)}
              disabled={cleaningMedia || !mediaUsage || mediaUsage.unusedCount === 0}
              className="gap-2"
            >
              {cleaningMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete orphaned files
            </Button>
          </div>
          {mediaDryRun ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
              <p className="font-medium">Dry run result</p>
              <p className="mt-1 text-xs">
                Would delete <span className="font-semibold tabular-nums">{mediaDryRun.unusedCount}</span> object(s). Cross-check
                with the reference scan above before confirming.
              </p>
              {mediaDryRun.unusedFiles.length > 0 ? (
                <ul className="mt-2 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5 font-mono text-[11px]">
                  {mediaDryRun.unusedFiles.slice(0, 25).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {mediaUsage ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Total files: <span className="font-medium text-foreground">{mediaUsage.total}</span> · Referenced:{" "}
                <span className="font-medium text-foreground">{mediaUsage.usedCount}</span> · Orphaned:{" "}
                <span className="font-medium text-foreground">{mediaUsage.unusedCount}</span>
              </p>
              {mediaUsage.unusedCount > 0 ? (
                <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-muted-foreground">
                  {mediaUsage.unusedFiles.slice(0, 30).map((file) => (
                    <li key={file} className="font-mono">{file}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-muted-foreground" />
            Database maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipHint label="Runs lightweight DB optimizer for current engine">
            <Button onClick={() => void optimizeDatabase()} disabled={optimizingDb} className="gap-2">
              {optimizingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Optimize database
            </Button>
          </TooltipHint>
          <p className="text-xs text-muted-foreground">
            Runs <span className="font-mono">VACUUM</span> on SQLite or <span className="font-mono">ANALYZE</span> on PostgreSQL.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Broken link checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {staleBrokenFromHistory && lastLinkScan ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              <p className="font-medium">Last recorded scan had broken links</p>
              <p className="mt-0.5 text-xs">
                {new Date(lastLinkScan.createdAt).toLocaleString()}: {lastLinkScan.brokenCount} broken ·{" "}
                {lastLinkScan.scannedDocuments} documents · {lastLinkScan.scannedLinks} links. Run a fresh scan to update.
              </p>
            </div>
          ) : null}
          <TooltipHint label="Scans post and custom-page markdown for broken internal links">
            <Button onClick={() => void runLinkCheck()} disabled={checkingLinks} className="gap-2">
              {checkingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Run link scan
            </Button>
          </TooltipHint>
          {linkCheck ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Documents: <span className="font-medium text-foreground">{linkCheck.scannedDocuments}</span> · Links:{" "}
                <span className="font-medium text-foreground">{linkCheck.scannedLinks}</span> · Broken:{" "}
                <span className="font-medium text-foreground">{linkCheck.brokenCount}</span>
              </p>
              {linkCheck.brokenLinks.length > 0 ? (
                <>
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadBrokenLinksCsv}>
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Export CSV
                    </Button>
                  </div>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-foreground">
                    {linkCheck.brokenLinks.slice(0, 50).map((issue) => (
                      <li key={`${issue.sourceType}:${issue.sourceId}:${issue.href}`} className="rounded border border-border bg-card px-2 py-1">
                        <span className="font-medium">{issue.sourceType}</span> · {issue.sourceLabel} →{" "}
                        <span className="font-mono">{issue.normalizedPath}</span>
                        <a
                          href={issue.sourceType === "post" ? `/dashboard/posts/${issue.sourceId}` : "/dashboard/content/pages"}
                          className="ml-2 text-primary underline underline-offset-2"
                        >
                          Open source
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-xs text-emerald-700">No broken internal markdown links detected.</p>
              )}
            </div>
          ) : null}
          {linkCheckHistory.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Recent scans</p>
              <ul className="mt-2 space-y-1">
                {linkCheckHistory.map((entry) => (
                  <li key={entry.id}>
                    {new Date(entry.createdAt).toLocaleString()} · docs {entry.scannedDocuments} · links {entry.scannedLinks} ·
                    broken {entry.brokenCount}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            Workflow pipeline health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipHint label="Shows contact-form to webhook delivery health over the last 7 days">
            <Button variant="outline" onClick={() => void loadWorkflowHealth()} disabled={loadingWorkflowHealth} className="gap-2">
              {loadingWorkflowHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh workflow health
            </Button>
          </TooltipHint>
          {workflowHealth ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Webhook configured: <span className="font-medium text-foreground">{workflowHealth.webhookConfigured ? "yes" : "no"}</span> ·
                Submissions ({workflowHealth.windowDays}d):{" "}
                <span className="font-medium text-foreground">{workflowHealth.submissionsLast7d}</span> · Delivered:{" "}
                <span className="font-medium text-foreground">{workflowHealth.deliveredLast7d}</span> · Failed:{" "}
                <span className="font-medium text-foreground">{workflowHealth.failedLast7d}</span> · Failure rate:{" "}
                <span className="font-medium text-foreground">{workflowHealth.failureRate}%</span>
              </p>
              {workflowHealth.recentFailures.length > 0 ? (
                <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-amber-700">
                  {workflowHealth.recentFailures.map((entry) => (
                    <li key={entry.id} className="rounded border border-amber-200 bg-amber-50 px-2 py-1">
                      {new Date(entry.createdAt).toLocaleString()} · {entry.details ?? "Webhook delivery failed"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-emerald-700">No webhook delivery failures recorded in this window.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDriveUpload className="h-4 w-4 text-muted-foreground" />
            Backup snapshot trigger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipHint label="Runs scripts/backup-data.sh using configured remote backup target settings">
            <Button onClick={() => void triggerBackupSnapshot()} disabled={triggeringBackup} className="gap-2">
              {triggeringBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveUpload className="h-4 w-4" />}
              Trigger backup now
            </Button>
          </TooltipHint>
          <p className="text-xs text-muted-foreground">
            Requires <span className="font-mono">ALLOW_SERVER_BACKUP=true</span> on the host. Uses Site settings backup target when configured.
          </p>
          {backupMessage ? (
            <p className="text-sm text-muted-foreground">{backupMessage}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            SEO integrity diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipHint label="Validates RSS, sitemap, robots.txt, and security.txt endpoints">
            <Button onClick={() => void runSeoIntegrityScan()} disabled={checkingSeoIntegrity} className="gap-2">
              {checkingSeoIntegrity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rss className="h-4 w-4" />}
              Run SEO integrity scan
            </Button>
          </TooltipHint>
          {seoIntegrity ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                RSS items: <span className="font-medium text-foreground">{seoIntegrity.checks.rss.itemCount}</span> · Sitemap URLs:{" "}
                <span className="font-medium text-foreground">{seoIntegrity.checks.sitemap.urlCount}</span>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>RSS status: {seoIntegrity.checks.rss.status} · Atom self-link: {seoIntegrity.checks.rss.hasAtomSelfLink ? "yes" : "no"}</li>
                <li>Sitemap status: {seoIntegrity.checks.sitemap.status} · Home URL: {seoIntegrity.checks.sitemap.hasHomeUrl ? "yes" : "no"} · Blog URL: {seoIntegrity.checks.sitemap.hasBlogUrl ? "yes" : "no"}</li>
                <li>Robots status: {seoIntegrity.checks.robots.status} · Has sitemap declaration: {seoIntegrity.checks.robots.hasSitemapDeclaration ? "yes" : "no"}</li>
                <li>Security.txt status: {seoIntegrity.checks.securityTxt.status} · Has contact: {seoIntegrity.checks.securityTxt.hasContact ? "yes" : "no"}</li>
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
