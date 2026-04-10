"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSocialShareCardUrl, type ShareCardTheme } from "@/lib/social-share-card";

type SocialShareCardControlsProps = {
  title: string;
  subtitle?: string;
  label: string;
};

const THEMES: Array<{ id: ShareCardTheme; name: string }> = [
  { id: "slate", name: "Slate" },
  { id: "blue", name: "Blue" },
  { id: "emerald", name: "Emerald" },
];

export function SocialShareCardControls({ title, subtitle = "", label }: SocialShareCardControlsProps) {
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [theme, setTheme] = useState<ShareCardTheme>("slate");
  const [copied, setCopied] = useState(false);

  const finalTitle = customTitle.trim() || title || "Untitled";
  const finalSubtitle = customSubtitle.trim() || subtitle;
  const shareImageUrl = useMemo(
    () => buildSocialShareCardUrl({ title: finalTitle, subtitle: finalSubtitle, label, theme }),
    [finalSubtitle, finalTitle, label, theme]
  );

  const handleCopyUrl = async () => {
    try {
      const absolute = `${window.location.origin}${shareImageUrl}`;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Social share card</p>
      <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
        <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Override title (optional)" />
        <Input
          value={customSubtitle}
          onChange={(e) => setCustomSubtitle(e.target.value)}
          placeholder="Override subtitle (optional)"
        />
        <div className="flex items-center gap-1">
          {THEMES.map((entry) => (
            <Button
              key={entry.id}
              type="button"
              size="sm"
              variant={theme === entry.id ? "default" : "outline"}
              onClick={() => setTheme(entry.id)}
            >
              {entry.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shareImageUrl}
          alt="Social share card preview"
          className="aspect-[1200/630] w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <code className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{shareImageUrl}</code>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyUrl()}>
          {copied ? "Copied" : "Copy image URL"}
        </Button>
      </div>
    </div>
  );
}
