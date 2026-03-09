"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImagePlus, Save, Send } from "lucide-react";

type EditorSlug = "home" | "about" | "contact";
type TextBinding = { key: string; selector: string };

const EDITABLE_CLASS =
  "rounded-sm outline outline-2 outline-offset-2 outline-sky-300/70 transition-colors hover:outline-sky-500/80";

function getTextBindings(slug: EditorSlug): TextBinding[] {
  if (slug === "home") {
    return [
      { key: "heroTitle", selector: "main section h1" },
      { key: "heroSubtitle", selector: "main section h1 + p" },
      { key: "ctaPrimaryText", selector: "main section a:nth-of-type(1) button" },
      { key: "ctaSecondaryText", selector: "main section a:nth-of-type(2) button" },
      { key: "ctaContactText", selector: "main section a:nth-of-type(3) button" },
    ];
  }
  if (slug === "contact") {
    return [
      { key: "intro", selector: "main h1 + p" },
      { key: "formNote", selector: "main h1 + p + p" },
    ];
  }
  return [
    { key: "heroName", selector: "main [data-about-content] h1" },
    { key: "heroTagline", selector: "main [data-about-content] h1 + p" },
    { key: "introText", selector: "main [data-about-content] .mt-8 p" },
  ];
}

export function ImmersiveEditorOverlay({ slug }: { slug: EditorSlug }) {
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const textBindings = useMemo(() => getTextBindings(slug), [slug]);

  useEffect(() => {
    const cleanup: Array<() => void> = [];

    for (const binding of textBindings) {
      const el = document.querySelector(binding.selector);
      if (!el || !(el instanceof HTMLElement)) continue;
      el.contentEditable = "true";
      el.setAttribute("data-editor-key", binding.key);
      el.classList.add(...EDITABLE_CLASS.split(" "));
      cleanup.push(() => {
        el.contentEditable = "false";
        el.classList.remove(...EDITABLE_CLASS.split(" "));
      });
    }

    const imgs = Array.from(document.querySelectorAll("main img"));
    for (const img of imgs) {
      img.classList.add(...EDITABLE_CLASS.split(" "));
      const onClick = () => {
        const current = img.getAttribute("src") ?? "";
        const next = window.prompt("Replace image URL", current);
        if (next && next.trim()) {
          img.setAttribute("src", next.trim());
          setStatus("Image updated. Click Save & Publish.");
        }
      };
      img.addEventListener("click", onClick);
      cleanup.push(() => {
        img.classList.remove(...EDITABLE_CLASS.split(" "));
        img.removeEventListener("click", onClick);
      });
    }

    return () => {
      for (const fn of cleanup) fn();
    };
  }, [textBindings]);

  const collectText = useCallback(() => {
    const out: Record<string, string> = {};
    for (const binding of textBindings) {
      const el = document.querySelector(binding.selector);
      if (!el) continue;
      out[binding.key] = (el.textContent ?? "").trim();
    }
    return out;
  }, [textBindings]);

  const save = useCallback(
    async (publish: boolean) => {
      setSaving(true);
      setStatus("");
      try {
        const text = collectText();
        if (slug === "home" || slug === "contact") {
          const existingRes = await fetch(`/api/site-content?page=${slug}`, { cache: "no-store" });
          const existing = existingRes.ok ? await existingRes.json() : {};
          const payload = { ...(existing ?? {}), ...text };
          const saveRes = await fetch("/api/site-content", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: slug, content: payload }),
          });
          if (!saveRes.ok) throw new Error("Failed to save page content");
        } else {
          const existingRes = await fetch("/api/about/config", { cache: "no-store" });
          const existing = existingRes.ok ? await existingRes.json() : {};
          const profileImage = document.querySelector("main [data-about-content] img")?.getAttribute("src") ?? existing.profileImage;
          const saveRes = await fetch("/api/about/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...existing, ...text, profileImage }),
          });
          if (!saveRes.ok) throw new Error("Failed to save about content");
        }
        setStatus(publish ? "Saved and published." : "Saved.");
      } catch {
        setStatus("Save failed. Check API/auth and try again.");
      } finally {
        setSaving(false);
      }
    },
    [collectText, slug]
  );

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-xl border border-slate-300 bg-white/95 p-3 shadow-xl backdrop-blur">
      <p className="text-sm font-semibold text-slate-900">Immersive Editor</p>
      <p className="text-xs text-slate-600">
        Click any highlighted text and type directly on the page.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => save(false)} disabled={saving}>
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button size="sm" className="gap-1" onClick={() => save(true)} disabled={saving}>
          <Send className="h-4 w-4" />
          Save & Publish
        </Button>
        <Link href="/dashboard/media" target="_blank">
          <Button size="sm" variant="outline" className="gap-1">
            <ImagePlus className="h-4 w-4" />
            Media
          </Button>
        </Link>
      </div>
      {status ? <p className="text-xs text-slate-600">{status}</p> : null}
    </div>
  );
}
