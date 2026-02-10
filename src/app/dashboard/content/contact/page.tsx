"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type ContactContent = {
  intro?: string;
  formNote?: string;
};

const defaultIntro = "I'm open to new opportunities, collaborations, or a chat about tech.";
const defaultFormNote = "Use the form below, or email me directly. Messages from the form go to the same address.";

export default function EditContactPage() {
  const [content, setContent] = useState<ContactContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/site-content?page=contact")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setContent(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "contact", content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/content" className="text-slate-600 hover:text-slate-900">
          ← Content
        </Link>
        <h2 className="text-3xl font-bold text-slate-900">Edit Contact Page</h2>
      </div>

      {message && (
        <p className={message.type === "success" ? "text-green-700" : "text-red-700"}>
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contact Page Text</CardTitle>
          <p className="text-sm text-slate-600">Intro and note below the title. Leave empty to use default.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Intro (main paragraph)</Label>
            <Textarea
              value={content.intro ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, intro: e.target.value }))}
              placeholder={defaultIntro}
              rows={3}
              className="resize-y"
            />
          </div>
          <div>
            <Label>Form note (below intro)</Label>
            <Textarea
              value={content.formNote ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, formNote: e.target.value }))}
              placeholder={defaultFormNote}
              rows={2}
              className="resize-y"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Contact Page"}
      </Button>
    </div>
  );
}
