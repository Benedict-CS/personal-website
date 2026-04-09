"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Fuse, { type IFuseOptions } from "fuse.js";
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
  Mail,
  FileUser,
  Shield,
  Wrench,
  Globe,
  LayoutList,
  Replace,
  Braces,
  Archive,
  BookOpen,
  User,
  House,
  Rss,
  Map as MapIcon,
  Bot,
  KeyRound,
  Link2,
} from "lucide-react";
import {
  DASHBOARD_MODAL_PANEL_BASE,
  DASHBOARD_OVERLAY_SCRIM,
} from "@/components/dashboard/dashboard-overlay-classes";

type ActionSection = "go" | "create" | "content";

type Action = {
  id: string;
  label: string;
  keywords: string[];
  href?: string;
  command?: "create_quick_draft" | "copy_rss_url" | "copy_sitemap_url";
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  section: ActionSection;
};

const ACTIONS: Action[] = [
  {
    id: "dashboard-home",
    label: "Dashboard home",
    keywords: ["home", "dashboard", "start"],
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "go",
  },
  {
    id: "dashboard-analytics",
    label: "Analytics",
    keywords: ["analytics", "traffic", "stats", "visitors", "ips"],
    href: "/dashboard/analytics",
    icon: BarChart3,
    section: "go",
  },
  {
    id: "site-overview",
    label: "Site overview",
    keywords: ["overview", "metrics", "summary", "dashboard"],
    href: "/dashboard/overview",
    icon: LayoutDashboard,
    section: "go",
  },
  {
    id: "posts-list",
    label: "All posts",
    keywords: ["posts", "blog", "articles", "list"],
    href: "/dashboard/posts",
    icon: LayoutList,
    section: "go",
  },
  {
    id: "public-home",
    label: "Home page (public site)",
    keywords: ["home", "public", "landing", "visitor", "root", "front", "www", "main", "homepage"],
    href: "/",
    icon: House,
    section: "go",
  },
  {
    id: "public-blog",
    label: "Blog index (public site)",
    keywords: ["blog", "public", "reader", "latest", "published", "posts"],
    href: "/blog",
    icon: BookOpen,
    section: "go",
  },
  {
    id: "public-blog-archive",
    label: "Blog archive (public site)",
    keywords: ["archive", "blog", "public", "year", "years", "chronological", "timeline", "browse"],
    href: "/blog/archive",
    icon: Archive,
    section: "go",
  },
  {
    id: "public-about",
    label: "About page (public site)",
    keywords: ["about", "public", "profile", "bio", "story", "visitor", "site"],
    href: "/about",
    icon: User,
    section: "go",
  },
  {
    id: "public-contact",
    label: "Contact page (public site)",
    keywords: ["contact", "public", "form", "email", "reach", "message", "visitor"],
    href: "/contact",
    icon: Mail,
    section: "go",
  },
  {
    id: "copy-rss-url",
    label: "Copy RSS feed URL",
    keywords: ["copy", "rss", "feed", "url", "share", "subscribe"],
    command: "copy_rss_url",
    icon: Rss,
    section: "go",
  },
  {
    id: "copy-sitemap-url",
    label: "Copy sitemap URL",
    keywords: ["copy", "sitemap", "xml", "url", "seo"],
    command: "copy_sitemap_url",
    icon: MapIcon,
    section: "go",
  },
  {
    id: "public-rss-feed",
    label: "Blog RSS feed (public site)",
    keywords: ["rss", "feed", "xml", "subscribe", "syndication", "reader", "atom"],
    href: "/feed.xml",
    icon: Rss,
    section: "go",
  },
  {
    id: "public-sitemap",
    label: "Sitemap XML (public site)",
    keywords: ["sitemap", "xml", "seo", "search", "engines", "crawl", "urlset", "index"],
    href: "/sitemap.xml",
    icon: MapIcon,
    section: "go",
  },
  {
    id: "public-robots",
    label: "Robots.txt (public site)",
    keywords: ["robots", "txt", "crawler", "spider", "bot", "seo", "allow", "disallow", "crawl"],
    href: "/robots.txt",
    icon: Bot,
    section: "go",
  },
  {
    id: "public-security-txt",
    label: "Security.txt (public site)",
    keywords: [
      "security",
      "security.txt",
      "disclosure",
      "vulnerability",
      "rfc",
      "9116",
      "well-known",
      "responsible",
      "contact",
    ],
    href: "/.well-known/security.txt",
    icon: KeyRound,
    section: "go",
  },
  {
    id: "posts-content-replace",
    label: "Find & replace in posts",
    keywords: ["replace", "find", "bulk", "migration", "url", "content", "operations", "search"],
    href: "/dashboard/posts/operations",
    icon: Replace,
    section: "go",
  },
  {
    id: "markdown-ast-lab",
    label: "Markdown AST lab",
    keywords: ["ast", "mdast", "syntax", "tree", "remark", "markdown", "debug", "parse", "gfm"],
    href: "/dashboard/tools/ast-lab",
    icon: Braces,
    section: "go",
  },
  {
    id: "hub-global-settings",
    label: "Global settings hub",
    keywords: ["hub", "global", "settings", "configuration", "site setup", "all settings"],
    href: "/dashboard/hubs/global-settings",
    icon: Settings,
    section: "go",
  },
  {
    id: "hub-taxonomy-assets",
    label: "Content taxonomy & assets hub",
    keywords: ["hub", "taxonomy", "assets", "media", "tags", "content operations"],
    href: "/dashboard/hubs/taxonomy-assets",
    icon: Layers,
    section: "go",
  },
  {
    id: "system-health",
    label: "System health",
    keywords: ["system", "health", "maintenance", "database", "cleanup"],
    href: "/dashboard/system",
    icon: Shield,
    section: "go",
  },
  {
    id: "system-link-checker",
    label: "System link checker",
    keywords: ["broken links", "link checker", "integrity", "markdown links", "scan links"],
    href: "/dashboard/system",
    icon: Link2,
    section: "go",
  },
  {
    id: "create-quick-draft",
    label: "Create quick draft post",
    keywords: ["quick", "draft", "post", "create", "instant", "new"],
    command: "create_quick_draft",
    icon: FilePlus2,
    section: "create",
  },
  {
    id: "create-post",
    label: "New post",
    keywords: ["new", "post", "write", "create", "draft"],
    href: "/dashboard/posts/new",
    icon: FilePlus2,
    section: "create",
  },
  {
    id: "editor-home",
    label: "Visual editor — home",
    keywords: ["editor", "visual", "wysiwyg", "home page"],
    href: "/editor/home",
    icon: PenSquare,
    section: "content",
  },
  {
    id: "editor-blog",
    label: "Visual editor — blog",
    keywords: ["editor", "blog", "visual"],
    href: "/editor/blog",
    icon: PenSquare,
    section: "content",
  },
  {
    id: "editor-about",
    label: "Visual editor — about",
    keywords: ["editor", "about", "visual", "profile", "bio"],
    href: "/editor/about",
    icon: PenSquare,
    section: "content",
  },
  {
    id: "editor-contact",
    label: "Visual editor — contact",
    keywords: ["editor", "contact", "visual", "form", "copy"],
    href: "/editor/contact",
    icon: PenSquare,
    section: "content",
  },
  {
    id: "content-site",
    label: "Site settings",
    keywords: ["site", "branding", "meta", "navigation", "footer"],
    href: "/dashboard/content/site",
    icon: Settings,
    section: "content",
  },
  {
    id: "content-contact",
    label: "Contact settings",
    keywords: ["contact", "form", "email", "webhook"],
    href: "/dashboard/content/contact",
    icon: Mail,
    section: "content",
  },
  {
    id: "content-about",
    label: "About page content",
    keywords: ["about", "profile", "bio", "story", "headshot", "personal", "intro"],
    href: "/dashboard/content/about",
    icon: FileText,
    section: "content",
  },
  {
    id: "content-custom-pages",
    label: "Custom pages",
    keywords: ["custom", "pages", "landing"],
    href: "/dashboard/content/pages",
    icon: Layers,
    section: "content",
  },
  {
    id: "content-home",
    label: "Home page content",
    keywords: ["home", "hero", "landing"],
    href: "/dashboard/content/home",
    icon: LayoutDashboard,
    section: "content",
  },
  {
    id: "notes",
    label: "Notes",
    keywords: ["notes", "scratch"],
    href: "/dashboard/notes",
    icon: StickyNote,
    section: "go",
  },
  {
    id: "media",
    label: "Media library",
    keywords: ["media", "images", "uploads", "assets"],
    href: "/dashboard/media",
    icon: ImageIcon,
    section: "go",
  },
  {
    id: "tags",
    label: "Tags",
    keywords: ["tags", "categories", "labels"],
    href: "/dashboard/tags",
    icon: Tags,
    section: "go",
  },
  {
    id: "cv",
    label: "CV & resume",
    keywords: ["cv", "resume", "pdf", "curriculum"],
    href: "/dashboard/cv",
    icon: FileUser,
    section: "go",
  },
  {
    id: "audit",
    label: "Audit log",
    keywords: ["audit", "history", "security", "log"],
    href: "/dashboard/audit",
    icon: Shield,
    section: "go",
  },
  {
    id: "setup",
    label: "Setup wizard",
    keywords: ["setup", "onboarding", "wizard", "first run"],
    href: "/dashboard/setup",
    icon: Wrench,
    section: "go",
  },
  {
    id: "sites",
    label: "Sites (multi-tenant)",
    keywords: ["sites", "saas", "tenants", "white label"],
    href: "/dashboard/sites",
    icon: Globe,
    section: "go",
  },
];

type PostHit = { id: string; title: string };

type ListItem = { type: "action"; action: Action } | { type: "post"; post: PostHit };

const MAX_POSTS_INDEX = 400;

const POST_FUSE_OPTIONS: IFuseOptions<PostHit> = {
  keys: ["title"],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

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

function actionScore(query: string, a: Action): number {
  if (!query.trim()) return 0;
  const labelS = fuzzyScore(query, a.label);
  const kwMax = Math.max(0, ...a.keywords.map((k) => fuzzyScore(query, k)));
  return Math.max(labelS, kwMax);
}

function buildFlatList(actions: Action[], posts: PostHit[]): ListItem[] {
  return [
    ...actions.map((action) => ({ type: "action" as const, action })),
    ...posts.map((post) => ({ type: "post" as const, post })),
  ];
}

const SECTION_LABEL: Record<ActionSection, string> = {
  go: "Navigate",
  create: "Create",
  content: "Content & editor",
};

function groupActions(actions: Action[]): { section: ActionSection; items: Action[] }[] {
  const order: ActionSection[] = ["go", "create", "content"];
  const map = new Map<ActionSection, Action[]>();
  for (const s of order) map.set(s, []);
  for (const a of actions) {
    map.get(a.section)?.push(a);
  }
  return order
    .map((section) => ({ section, items: map.get(section) ?? [] }))
    .filter((g) => g.items.length > 0);
}

/** Same grouping order as the UI so keyboard selection matches visual order. */
function orderActionsForPalette(actions: Action[]): Action[] {
  const order: ActionSection[] = ["go", "create", "content"];
  const out: Action[] = [];
  for (const sec of order) {
    for (const a of actions) {
      if (a.section === sec) out.push(a);
    }
  }
  return out;
}

export function DashboardCommandPalette() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [allPosts, setAllPosts] = useState<PostHit[]>([]);
  const flatListRef = useRef<ListItem[]>([]);
  const selectedRef = useRef(0);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const q = query.trim();
  const filteredActions = useMemo(() => {
    if (!q) return ACTIONS;
    return ACTIONS.filter(
      (a) => fuzzyMatch(q, a.label) || a.keywords.some((k) => fuzzyMatch(q, k))
    ).sort((a, b) => actionScore(q, b) - actionScore(q, a));
  }, [q]);

  const orderedActions = useMemo(
    () => orderActionsForPalette(filteredActions),
    [filteredActions]
  );

  const postFuse = useMemo(() => {
    const list = allPosts.map((p) => ({ ...p, title: p.title ?? "Untitled" }));
    return new Fuse(list, POST_FUSE_OPTIONS);
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    if (!allPosts.length) return [];
    if (!q.trim()) return allPosts.slice(0, 24);
    return postFuse.search(q.trim()).slice(0, 40).map((r) => r.item);
  }, [q, allPosts, postFuse]);

  const flatList = useMemo(
    () => buildFlatList(orderedActions, filteredPosts),
    [orderedActions, filteredPosts]
  );

  const activeIndex =
    flatList.length === 0 ? 0 : Math.min(selected, flatList.length - 1);

  const groupedActions = useMemo(() => groupActions(filteredActions), [filteredActions]);

  useEffect(() => {
    flatListRef.current = flatList;
    selectedRef.current = activeIndex;
  }, [flatList, activeIndex]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/posts", { credentials: "include" })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : [];
        const mapped: PostHit[] = raw
          .slice(0, MAX_POSTS_INDEX)
          .map((p: unknown) => {
            const o = p as { id?: string; title?: string };
            return { id: String(o.id ?? ""), title: o.title ?? "Untitled" };
          })
          .filter((p) => p.id.length > 0);
        setAllPosts(mapped);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  const executeCommand = useCallback(
    async (action: Action): Promise<boolean> => {
      if (!action.command) return false;
      if (action.command === "copy_rss_url") {
        await navigator.clipboard.writeText(`${window.location.origin}/feed.xml`);
        return true;
      }
      if (action.command === "copy_sitemap_url") {
        await navigator.clipboard.writeText(`${window.location.origin}/sitemap.xml`);
        return true;
      }
      if (action.command === "create_quick_draft") {
        const now = Date.now();
        const payload = {
          title: `Quick Draft ${new Date(now).toISOString().slice(0, 16).replace("T", " ")}`,
          slug: `quick-draft-${now}`,
          content: "# Quick Draft\n\nStart writing here...",
          published: false,
        };
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Failed to create quick draft.");
        }
        const created = (await response.json()) as { id?: string };
        if (created.id) {
          router.push(`/dashboard/posts/${created.id}`);
        } else {
          router.push("/dashboard/posts");
        }
        return true;
      }
      return false;
    },
    [router]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelected(0);
            return true;
          }
          return false;
        });
        return;
      }
      if (!openRef.current) return;
      if (e.key === "Escape") {
        closePalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => {
          const len = flatListRef.current.length;
          if (len === 0) return 0;
          const cur = Math.min(s, len - 1);
          return (cur + 1) % len;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => {
          const len = flatListRef.current.length;
          if (len === 0) return 0;
          const cur = Math.min(s, len - 1);
          return (cur - 1 + len) % len;
        });
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const list = flatListRef.current;
        const idx = selectedRef.current;
        const item = list[idx];
        if (!item) return;
        if (item.type === "action") {
          void (async () => {
            try {
              const handled = await executeCommand(item.action);
              if (!handled && item.action.href) {
                if (item.action.external) window.open(item.action.href, "_blank");
                else router.push(item.action.href);
              }
            } catch {
              // no-op
            } finally {
              closePalette();
            }
          })();
          return;
        }
        if (item.type === "post") {
          router.push(`/dashboard/posts/${item.post.id}`);
        }
        closePalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette, executeCommand, router]);

  const selectedItem = flatList[activeIndex];

  const runAction = useCallback(
    (item: ListItem) => {
      if (item.type === "action") {
        void (async () => {
          try {
            const handled = await executeCommand(item.action);
            if (!handled && item.action.href) {
              if (item.action.external) window.open(item.action.href, "_blank");
              else router.push(item.action.href);
            }
          } catch {
            // no-op
          } finally {
            closePalette();
          }
        })();
        return;
      }
      if (item.type === "post") {
        router.push(`/dashboard/posts/${item.post.id}`);
      }
      closePalette();
    },
    [closePalette, executeCommand, router]
  );

  const flatIndexByAction = useCallback(
    (action: Action) => flatList.findIndex((it) => it.type === "action" && it.action.id === action.id),
    [flatList]
  );

  const flatIndexByPost = useCallback(
    (postId: string) => flatList.findIndex((it) => it.type === "post" && it.post.id === postId),
    [flatList]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] backdrop-blur-[4px] ${DASHBOARD_OVERLAY_SCRIM}`}
          onClick={closePalette}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 32, mass: 0.85 }
            }
            className={`mx-4 w-full max-w-xl overflow-hidden rounded-xl ${DASHBOARD_MODAL_PANEL_BASE}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span
                className="hidden shrink-0 rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground sm:inline"
                aria-hidden
              >
                ⌘K
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                placeholder="Jump to a post, page, or action…"
                className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                autoFocus
                aria-label="Search command palette"
                aria-controls="command-palette-listbox"
              />
            </div>
            <div
              id="command-palette-listbox"
              className="max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain py-2"
              role="listbox"
              aria-label="Commands and posts"
              aria-activedescendant={
                selectedItem
                  ? selectedItem.type === "post"
                    ? `palette-post-${selectedItem.post.id}`
                    : selectedItem.action.id
                  : undefined
              }
            >
              {flatList.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No matches</div>
              ) : (
                <>
                  {groupedActions.map((group) => (
                    <div key={group.section} role="group" aria-label={SECTION_LABEL[group.section]}>
                      <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground first:pt-0">
                        {SECTION_LABEL[group.section]}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((action) => {
                          const i = flatIndexByAction(action);
                          const isSel = i === activeIndex;
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              role="option"
                              id={action.id}
                              aria-selected={isSel}
                              onClick={() => runAction({ type: "action", action })}
                              onMouseEnter={() => setSelected(i)}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                isSel
                                  ? "bg-accent text-accent-foreground"
                                  : "text-foreground hover:bg-accent/50"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0 opacity-80" />
                              <span className="flex-1 truncate">{action.label}</span>
                              {action.external ? <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredPosts.length > 0 ? (
                    <div role="group" aria-label="Posts">
                      <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Posts
                        {!q.trim() && allPosts.length > 24 ? (
                          <span className="ml-2 font-normal normal-case text-muted-foreground/80">
                            (type to search all {allPosts.length})
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-0.5">
                        {filteredPosts.map((post) => {
                          const i = flatIndexByPost(post.id);
                          const isSel = i === activeIndex;
                          return (
                            <button
                              key={post.id}
                              type="button"
                              role="option"
                              id={`palette-post-${post.id}`}
                              aria-selected={isSel}
                              onClick={() => runAction({ type: "post", post })}
                              onMouseEnter={() => setSelected(i)}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                isSel
                                  ? "bg-accent text-accent-foreground"
                                  : "text-foreground hover:bg-accent/50"
                              }`}
                            >
                              <FileText className="h-4 w-4 shrink-0 opacity-80" />
                              <span className="min-w-0 flex-1 truncate">{post.title || "Untitled"}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">Post</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground" aria-hidden>
              <span className="font-medium text-foreground/80">↑↓</span> select ·{" "}
              <span className="font-medium text-foreground/80">↵</span> open ·{" "}
              <span className="font-medium text-foreground/80">Esc</span> close ·{" "}
              <span className="font-medium text-foreground/80">?</span> shortcuts
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
