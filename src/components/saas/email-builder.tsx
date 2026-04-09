"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EmailBlock = {
  id: string;
  type: "heading" | "paragraph" | "button" | "image" | "divider";
  content: string;
};

function renderHtml(blocks: EmailBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "heading") return `<h2 style="margin:0 0 12px;font-family:Inter,Arial,sans-serif;">${b.content}</h2>`;
      if (b.type === "paragraph") return `<p style="margin:0 0 12px;font-family:Inter,Arial,sans-serif;line-height:1.7;">${b.content}</p>`;
      if (b.type === "button")
        return `<p style="margin:0 0 12px;"><a href="#" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-family:Inter,Arial,sans-serif;">${b.content}</a></p>`;
      if (b.type === "image") return `<img src="${b.content}" alt="email" style="max-width:100%;border-radius:8px;margin:0 0 12px;" />`;
      return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />`;
    })
    .join("");
}

export function EmailBuilder({ siteId }: { siteId: string }) {
  const [name, setName] = useState("Product Newsletter");
  const [subject, setSubject] = useState("New updates from our store");
  const [listId, setListId] = useState("");
  const [status, setStatus] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    { id: "b1", type: "heading", content: "New arrivals this week" },
    { id: "b2", type: "paragraph", content: "Discover the latest products and limited-time offers." },
    { id: "b3", type: "button", content: "Shop now" },
  ]);

  const html = useMemo(() => renderHtml(blocks), [blocks]);

  const addBlock = (type: EmailBlock["type"]) => {
    setBlocks((prev) => [...prev, { id: `b_${Math.random().toString(36).slice(2, 8)}`, type, content: type === "image" ? "https://placehold.co/800x400" : "New content" }]);
  };

  const sendCampaign = async (sendNow: boolean) => {
    const res = await fetch(`/api/saas/sites/${siteId}/crm/email-campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subject,
        contentHtml: `<div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff;">${html}</div>`,
        blocks,
        mailingListId: listId || null,
        sendNow,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(sendNow ? "Campaign sent." : "Campaign saved as draft.");
    } else {
      setStatus(typeof data.error === "string" ? data.error : "Failed to create campaign.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Campaign Settings</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
        <Input value={listId} onChange={(e) => setListId(e.target.value)} placeholder="Mailing list ID (optional)" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => addBlock("heading")}>+ Heading</Button>
          <Button variant="outline" onClick={() => addBlock("paragraph")}>+ Paragraph</Button>
          <Button variant="outline" onClick={() => addBlock("button")}>+ Button</Button>
          <Button variant="outline" onClick={() => addBlock("image")}>+ Image</Button>
        </div>
        <Button variant="outline" onClick={() => sendCampaign(false)}>Save Draft</Button>
        <Button onClick={() => sendCampaign(true)}>Send Campaign</Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </aside>

      <section className="rounded border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Visual Email Builder</h2>
        {blocks.map((block) => (
          <div key={block.id} className="rounded border border-border p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{block.type}</p>
            <Textarea
              value={block.content}
              rows={block.type === "paragraph" ? 4 : 2}
              onChange={(e) =>
                setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content: e.target.value } : b)))
              }
            />
          </div>
        ))}
        <div className="rounded border border-border/60 bg-muted p-3">
          <p className="mb-2 text-sm font-semibold">Rendered HTML preview</p>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>
    </div>
  );
}

