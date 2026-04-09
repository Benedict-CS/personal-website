"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeploymentJob = {
  id: string;
  provider: string;
  imageTag: string;
  status: string;
  logs: string[];
  createdAt: string;
  finishedAt?: string | null;
};

export default function SiteInfrastructurePage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [jobs, setJobs] = useState<DeploymentJob[]>([]);
  const [provider, setProvider] = useState<"docker" | "kubernetes">("docker");
  const [imageTag, setImageTag] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [statusText, setStatusText] = useState("");

  const loadJobs = useCallback(async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/infra/deployments`);
    if (res.ok) setJobs(await res.json());
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    const timer = window.setTimeout(() => {
      void loadJobs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, loadJobs]);

  const deploy = async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/infra/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        imageTag: imageTag || `tenant-${siteId}:latest`,
        customDomain: customDomain || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatusText(`Deployment queued: ${data.jobId}`);
      await loadJobs();
    } else {
      setStatusText(typeof data.error === "string" ? data.error : "Failed to deploy");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custom Cloud Orchestration</h1>
          <p className="text-muted-foreground">Tenant-level CI/CD pipeline with Docker/Kubernetes deploy and SSL provisioning.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>

      <div className="rounded border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Deploy Tenant Site</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <select
            className="rounded border border-input px-3 py-2"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "docker" | "kubernetes")}
          >
            <option value="docker">Docker</option>
            <option value="kubernetes">Kubernetes</option>
          </select>
          <Input value={imageTag} onChange={(e) => setImageTag(e.target.value)} placeholder="tenant-image:latest" />
          <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="custom domain (optional)" />
          <Button onClick={deploy}>Deploy</Button>
        </div>
        {statusText ? <p className="text-sm text-muted-foreground">{statusText}</p> : null}
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{job.imageTag}</p>
                <p className="text-sm text-muted-foreground">{job.provider} - {job.status}</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
            {Array.isArray(job.logs) && job.logs.length > 0 ? (
              <pre className="mt-2 overflow-auto rounded bg-muted/40 p-2 text-xs">{job.logs.join("\n")}</pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

