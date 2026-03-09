"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  BarChart3,
  StickyNote,
  Image as ImageIcon,
  Tags,
  ExternalLink,
  Settings,
  Layers,
} from "lucide-react";

type Action = {
  id: string;
  label: string;
  keywords: string[];
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

const ACTIONS: Action[] = [
  { id: "editor-home", label: "Open visual editor", keywords: ["editor", "home", "visual"], href: "/editor/home", icon: PenSquare },
  { id: "editor-blog", label: "Blog editor", keywords: ["editor", "blog", "posts"], href: "/editor/blog", icon: PenSquare },
  { id: "analytics", label: "Analytics", keywords: ["analytics", "stats", "views"], href: "/dashboard/analytics", icon: BarChart3 },
  { id: "content-site", label: "Site settings", keywords: ["site", "settings", "navigation"], href: "/dashboard/content/site", icon: Settings },
  { id: "content-custom-pages", label: "Custom pages", keywords: ["custom", "pages", "additional"], href: "/dashboard/content/pages", icon: Layers },
  { id: "notes", label: "Notes", keywords: ["notes"], href: "/dashboard/notes", icon: StickyNote },
  { id: "media", label: "Media", keywords: ["media", "images"], href: "/dashboard/media", icon: ImageIcon },
  { id: "tags", label: "Tags", keywords: ["tags"], href: "/dashboard/tags", icon: Tags },
];

export function DashboardCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const filtered = query.trim()
    ? ACTIONS.filter(
        (a) =>
          a.label.toLowerCase().includes(query.trim().toLowerCase()) ||
          a.keywords.some((k) => k.includes(query.trim().toLowerCase()))
      )
    : ACTIONS;

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            setQuery("");
            setSelected(0);
          }
          return !o;
        });
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        closePalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => (s + 1) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => (s - 1 + filtered.length) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        const a = filtered[selected];
        if (a.href) {
          if (a.external) window.open(a.href, "_blank");
          else router.push(a.href);
        }
        closePalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePalette, filtered, selected, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/40"
      onClick={closePalette}
      role="dialog"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-slate-200 px-3">
          <span className="text-slate-400">⌘K</span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Search pages..."
            className="flex-1 border-0 bg-transparent py-3 px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            autoFocus
          />
        </div>
        <ul className="max-h-[60vh] overflow-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">No matches</li>
          ) : (
            filtered.map((action, i) => {
              const Icon = action.icon;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (action.href) {
                        if (action.external) window.open(action.href, "_blank");
                        else router.push(action.href);
                      }
                      closePalette();
                    }}
                    onMouseEnter={() => setSelected(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      i === selected ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="flex-1">{action.label}</span>
                    {action.external && <ExternalLink className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          ↑↓ navigate · Enter open · Esc close
        </p>
      </div>
    </div>
  );
}
