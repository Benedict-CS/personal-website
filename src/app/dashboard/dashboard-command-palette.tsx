"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PenSquare,
  BarChart3,
  StickyNote,
  Image as ImageIcon,
  Tags,
  ExternalLink,
  Settings,
  Layers,
  FilePlus2,
  FileText,
} from "lucide-react";

type Action = {
  id: string;
  label: string;
  keywords: string[];
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  section?: "actions" | "create" | "posts";
};

const ACTIONS: Action[] = [
  { id: "dashboard-home", label: "Dashboard (traffic & IPs)", keywords: ["dashboard", "home", "analytics", "traffic", "ips"], href: "/dashboard/analytics", icon: BarChart3, section: "actions" },
  { id: "site-overview", label: "Site overview (posts & audits)", keywords: ["overview", "metrics", "posts", "dashboard"], href: "/dashboard/overview", icon: LayoutDashboard, section: "actions" },
  { id: "create-post", label: "Create new post", keywords: ["new", "post", "write", "create"], href: "/dashboard/posts/new", icon: FilePlus2, section: "create" },
  { id: "editor-home", label: "Open visual editor", keywords: ["editor", "home", "visual"], href: "/editor/home", icon: PenSquare, section: "actions" },
  { id: "editor-blog", label: "Blog editor", keywords: ["editor", "blog", "posts"], href: "/editor/blog", icon: PenSquare, section: "actions" },
  { id: "content-site", label: "Site settings", keywords: ["site", "settings", "navigation"], href: "/dashboard/content/site", icon: Settings, section: "actions" },
  { id: "content-custom-pages", label: "Custom pages", keywords: ["custom", "pages", "additional"], href: "/dashboard/content/pages", icon: Layers, section: "actions" },
  { id: "notes", label: "Notes", keywords: ["notes"], href: "/dashboard/notes", icon: StickyNote, section: "actions" },
  { id: "media", label: "Media", keywords: ["media", "images"], href: "/dashboard/media", icon: ImageIcon, section: "actions" },
  { id: "tags", label: "Tags", keywords: ["tags"], href: "/dashboard/tags", icon: Tags, section: "actions" },
];

type PostHit = { id: string; title: string };

type ListItem = { type: "action"; action: Action } | { type: "post"; post: PostHit };

/** Fuzzy match: query chars appear in order in text (case-insensitive). */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = text.toLowerCase();
  let j = 0;
  for (let i = 0; i < t.length && j < q.length; i++) {
    if (t[i] === q[j]) j++;
  }
  return j === q.length;
}

/** Score for sorting: higher = better (more consecutive / earlier matches). */
function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let j = 0;
  let run = 0;
  for (let i = 0; i < t.length && j < q.length; i++) {
    if (t[i] === q[j]) {
      j++;
      run++;
      score += run + (i === 0 || t[i - 1] === " " ? 10 : 0);
    } else {
      run = 0;
    }
  }
  return j === q.length ? score : -1;
}

function buildFlatList(actions: Action[], posts: PostHit[]): ListItem[] {
  return [
    ...actions.map((action) => ({ type: "action" as const, action })),
    ...posts.map((post) => ({ type: "post" as const, post })),
  ];
}

export function DashboardCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recentPosts, setRecentPosts] = useState<PostHit[]>([]);

  const q = query.trim();
  const filteredActions = q
    ? ACTIONS.filter(
        (a) =>
          fuzzyMatch(q, a.label) ||
          a.keywords.some((k) => fuzzyMatch(q, k))
      ).sort(
        (a, b) =>
          Math.max(
            fuzzyScore(q, b.label),
            ...b.keywords.map((k) => fuzzyScore(q, k))
          ) -
          Math.max(
            fuzzyScore(q, a.label),
            ...a.keywords.map((k) => fuzzyScore(q, k))
          )
      )
    : ACTIONS;

  const filteredPosts = q
    ? recentPosts
        .filter((p) => fuzzyMatch(q, p.title ?? "Untitled"))
        .sort((a, b) => fuzzyScore(q, b.title ?? "Untitled") - fuzzyScore(q, a.title ?? "Untitled"))
    : recentPosts.slice(0, 8);

  const flatList = buildFlatList(filteredActions, filteredPosts);
  const selectedItem = flatList[selected];
  const flatListRef = useRef<ListItem[]>([]);
  const selectedRef = useRef(0);

  useEffect(() => {
    flatListRef.current = flatList;
    selectedRef.current = selected;
  }, [flatList, selected]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/posts", { credentials: "include" })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Array.isArray((data as { posts?: unknown[] })?.posts) ? (data as { posts: unknown[] }).posts : [];
        setRecentPosts(
          list.slice(0, 8).map((p: { id: string; title: string }) => ({ id: (p as { id: string }).id, title: (p as { title: string }).title ?? "Untitled" }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

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
        const len = Math.max(1, flatListRef.current.length);
        setSelected((s) => (s + 1) % len);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const len = Math.max(1, flatListRef.current.length);
        setSelected((s) => (s - 1 + len) % len);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const list = flatListRef.current;
        const idx = selectedRef.current;
        const item = list[idx];
        if (!item) return;
        if (item.type === "action" && item.action.href) {
          if (item.action.external) window.open(item.action.href, "_blank");
          else router.push(item.action.href);
        } else if (item.type === "post") {
          router.push(`/dashboard/posts/${item.post.id}`);
        }
        closePalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePalette, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] bg-[oklch(0.2_0.02_265/0.35)] backdrop-blur-sm"
          onClick={closePalette}
          role="dialog"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-xl rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-hover)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
              <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]" aria-hidden>
                ⌘K
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                placeholder="Search pages, posts, or run an action..."
                className="flex-1 border-0 bg-transparent py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0"
                autoFocus
                aria-label="Search command palette"
              />
            </div>
            <ul className="max-h-[55vh] overflow-auto py-2" role="listbox" aria-activedescendant={selectedItem ? (selectedItem.type === "post" ? `post-${selectedItem.post.id}` : selectedItem.action.id) : undefined}>
              {flatList.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" role="option" aria-selected="false">No matches</li>
              ) : (
                flatList.map((item, i) => {
                  if (item.type === "action") {
                    const Icon = item.action.icon;
                    return (
                      <li key={item.action.id} role="option" aria-selected={i === selected ? "true" : "false"}>
                        <button
                          type="button"
                          id={item.action.id}
                          onClick={() => {
                            if (item.action.href) {
                              if (item.action.external) window.open(item.action.href, "_blank");
                              else router.push(item.action.href);
                            }
                            closePalette();
                          }}
                          onMouseEnter={() => setSelected(i)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            i === selected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--accent)]/60"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                          <span className="flex-1">{item.action.label}</span>
                          {item.action.external && <ExternalLink className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={`post-${item.post.id}`} role="option" aria-selected={i === selected ? "true" : "false"}>
                      <button
                        type="button"
                        id={`post-${item.post.id}`}
                        onClick={() => {
                          router.push(`/dashboard/posts/${item.post.id}`);
                          closePalette();
                        }}
                        onMouseEnter={() => setSelected(i)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          i === selected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--accent)]/60"
                        }`}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                        <span className="flex-1 truncate">{item.post.title || "Untitled"}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">Post</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted-foreground)]" aria-hidden>
              ↑↓ navigate · Enter open · Esc close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
