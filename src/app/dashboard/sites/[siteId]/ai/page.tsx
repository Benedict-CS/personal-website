"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AiCopilotPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [prompt, setPrompt] = useState("A modern bakery website in New York");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string>("");

  const generate = async () => {
    setStatus("Generating site...");
    const res = await fetch(`/api/saas/sites/${siteId}/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(typeof data.error === "string" ? data.error : "Generation failed.");
      return;
    }
    const data = await res.json();
    setPreview(JSON.stringify(data.generated, null, 2));
    setStatus("AI site generation complete.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Copilot</h1>
          <p className="text-muted-foreground">Prompt-driven website generation with auto pages and block seeding.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>
      <div className="rounded border border-border bg-card p-4 space-y-3">
        <label className="text-sm font-medium">Prompt</label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
        <Button onClick={generate}>Generate Site with AI</Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
      {preview ? (
        <pre className="rounded border border-border bg-muted/40 p-3 text-xs overflow-auto">{preview}</pre>
      ) : null}
    </div>
  );
}

