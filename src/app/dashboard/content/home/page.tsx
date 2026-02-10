"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  skills?: string[];
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  ctaContactText?: string;
  ctaContactHref?: string;
};

const defaults: HomeContent = {
  heroTitle: "Hi, I'm Benedict.",
  heroSubtitle: "Network Administrator | Full Stack Developer | Open Source Enthusiast",
  skills: ["Next.js", "TypeScript", "Proxmox", "Linux", "Networking", "Docker"],
  ctaPrimaryText: "Read My Blog",
  ctaPrimaryHref: "/blog",
  ctaSecondaryText: "View Projects",
  ctaSecondaryHref: "/about",
  ctaContactText: "Get in Touch",
  ctaContactHref: "/contact",
};

export default function EditHomePage() {
  const [content, setContent] = useState<HomeContent>(defaults);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/site-content?page=home")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setContent({ ...defaults, ...data });
          setSkillsText(Array.isArray(data.skills) ? data.skills.join("\n") : (data.skills as string) ?? defaults.skills!.join("\n"));
        } else {
          setContent(defaults);
          setSkillsText(defaults.skills!.join("\n"));
        }
      })
      .catch(() => {
        setContent(defaults);
        setSkillsText(defaults.skills!.join("\n"));
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const skills = skillsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      ...content,
      skills,
    };
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "home", content: payload }),
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
        <h2 className="text-3xl font-bold text-slate-900">Edit Home Page</h2>
      </div>

      {message && (
        <p className={message.type === "success" ? "text-green-700" : "text-red-700"}>
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={content.heroTitle ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, heroTitle: e.target.value }))}
              placeholder={defaults.heroTitle}
            />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input
              value={content.heroSubtitle ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, heroSubtitle: e.target.value }))}
              placeholder={defaults.heroSubtitle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA Buttons</CardTitle>
          <p className="text-sm text-slate-600">Primary, secondary, and contact button.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Primary (e.g. Read My Blog)</Label>
              <Input
                value={content.ctaPrimaryText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaPrimaryText: e.target.value }))}
                placeholder="Read My Blog"
              />
              <Input
                className="mt-2"
                value={content.ctaPrimaryHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaPrimaryHref: e.target.value }))}
                placeholder="/blog"
              />
            </div>
            <div>
              <Label>Secondary (e.g. View Projects)</Label>
              <Input
                value={content.ctaSecondaryText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaSecondaryText: e.target.value }))}
                placeholder="View Projects"
              />
              <Input
                className="mt-2"
                value={content.ctaSecondaryHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaSecondaryHref: e.target.value }))}
                placeholder="/about"
              />
            </div>
            <div>
              <Label>Contact button</Label>
              <Input
                value={content.ctaContactText ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaContactText: e.target.value }))}
                placeholder="Get in Touch"
              />
              <Input
                className="mt-2"
                value={content.ctaContactHref ?? ""}
                onChange={(e) => setContent((c) => ({ ...c, ctaContactHref: e.target.value }))}
                placeholder="/contact"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical Skills</CardTitle>
          <p className="text-sm text-slate-600">One per line or comma-separated.</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            rows={6}
            placeholder="Next.js&#10;TypeScript&#10;..."
            className="resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Home Page"}
      </Button>
    </div>
  );
}
