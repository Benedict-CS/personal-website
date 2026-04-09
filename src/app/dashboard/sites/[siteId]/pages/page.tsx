"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

export default function TenantPagesPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/pages`);
    if (res.ok) setPages(await res.json());
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, load]);

  const createPage = async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        blocks: [],
      }),
    });
    if (res.ok) {
      setStatus("Page created.");
      setTitle("");
      setSlug("");
      await load();
    } else {
      setStatus("Failed to create page.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tenant Pages</h1>
        <p className="text-muted-foreground">Manage draft and published pages for this tenant site.</p>
      </div>
      <div className="rounded border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Create Page</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="page-slug" />
          <Button onClick={createPage}>Create</Button>
        </div>
        {status ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
      </div>

      <div className="space-y-3">
        {pages.map((p) => (
          <div key={p.id} className="rounded border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">/{p.slug} - {p.status}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/sites/${siteId}/editor/${p.id}`}>
                  <Button variant="outline">Open Editor</Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

