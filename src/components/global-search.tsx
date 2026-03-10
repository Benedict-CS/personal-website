"use client";

import { useState, useEffect, useRef, useCallback, type ReactElement } from "react";
import Link from "next/link";
import { Search, X, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  createdAt: string;
  tags: Array<{ name: string }>;
  snippets: string[];
}

interface SearchPage {
  path: string;
  title: string;
  snippets: string[];
}

interface SearchResult {
  posts: SearchPost[];
  pages: SearchPage[];
}

const DEBOUNCE_MS = 280;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingQuery, setPendingQuery] = useState("");
  const [result, setResult] = useState<SearchResult>({ posts: [], pages: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const term = value.trim();
      setPendingQuery(term);
      if (!term) {
        setResult({ posts: [], pages: [] });
        setLoading(false);
        debounceRef.current = null;
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then((res) => (res.ok ? res.json() : { posts: [], pages: [] }))
        .then((data: SearchResult) => setResult({ posts: data.posts || [], pages: data.pages || [] }))
        .catch(() => setResult({ posts: [], pages: [] }))
        .finally(() => setLoading(false));
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  const openPanel = useCallback(() => {
    setQuery("");
    setPendingQuery("");
    setResult({ posts: [], pages: [] });
    setLoading(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) {
      document.addEventListener("keydown", onKeyDown);
    }
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  function highlightSnippet(text: string, term: string): React.ReactNode {
    if (!text || !term.trim()) return text;
    const q = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${q})`, "gi");
    const parts = text.split(re);
    return parts.map((part, i) =>
      i % 2 === 1 ? <mark key={i} className="bg-[var(--primary)]/15 rounded px-0.5 text-[var(--foreground)]">{part}</mark> : part
    );
  }

  const hasResults = result.posts.length > 0 || result.pages.length > 0;
  const hasQuery = pendingQuery.trim().length > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--accent)]/60 text-xs sm:text-sm rounded-lg transition-colors duration-200"
        onClick={() => (open ? close() : openPanel())}
        aria-label="Search site"
      >
        <Search className="h-4 w-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-[99] bg-[oklch(0.2_0.02_265/0.25)] backdrop-blur-[2px]" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            className="search-panel-in fixed left-4 right-4 top-14 z-[100] overflow-hidden rounded-xl border border-[var(--border)] bg-card shadow-[var(--shadow-lg)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[min(90vw,28rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-2 border-b border-[var(--border)] p-2">
              <Search className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search blog & site (e.g. NYCU, proxy)..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
                autoComplete="off"
              />
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={close} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading && (
                <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Searching...</p>
              )}
              {!loading && hasQuery && !hasResults && (
                <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No results for &quot;{pendingQuery}&quot;</p>
              )}
              {!loading && !hasQuery && (
                <p className="py-4 px-3 text-sm text-[var(--muted-foreground)]">
                  Search blog posts and site pages (About, Contact, Home).
                </p>
              )}
              {!loading && hasResults && (
                <div className="py-2">
                  {result.pages.length > 0 && (
                    <div className="px-3 pb-2">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-[var(--muted-foreground)]">
                        <Globe className="h-3.5 w-3.5" /> Pages
                      </p>
                      <ul className="space-y-0.5">
                        {result.pages.flatMap((page) => {
                          const basePath = page.path;
                          const hasHighlight = !!pendingQuery.trim();
                          const snippetList = page.snippets.length > 0 ? page.snippets : [page.title];
                          return snippetList.map((snippet, i) => {
                            const pageHref = hasHighlight
                              ? `${basePath}?highlight=${encodeURIComponent(pendingQuery.trim())}&occurrence=${i + 1}`
                              : basePath;
                            return (
                              <li key={`${page.path}-${i}`}>
                                <Link
                                  href={pageHref}
                                  onClick={close}
                                  className="block rounded-lg px-2 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--accent)]/60 transition-colors duration-150"
                                >
                                  <span className="text-xs font-medium text-[var(--muted-foreground)]">{page.title}</span>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                                    {highlightSnippet(snippet, pendingQuery.trim())}
                                  </p>
                                </Link>
                              </li>
                            );
                          });
                        })}
                      </ul>
                    </div>
                  )}
                  {result.posts.length > 0 && (
                    <div className="px-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-[var(--muted-foreground)]">
                        <FileText className="h-3.5 w-3.5" /> Blog
                      </p>
                      <ul className="space-y-0.5">
                        {result.posts.flatMap((post) => {
                          const baseHref = `/blog/${post.slug}`;
                          const hasHighlight = !!pendingQuery.trim();
                          const snippetList = post.snippets.length > 0 ? post.snippets : [];
                          const items: ReactElement[] = [];
                          items.push(
                            <li key={`${post.id}-title`}>
                              <Link
                                href={baseHref}
                                onClick={close}
                                className="block rounded-lg px-2 py-1 text-left text-sm text-[var(--foreground)] hover:bg-[var(--accent)]/60 transition-colors duration-150"
                              >
                                <span className="font-medium">
                                  {highlightSnippet(post.title, pendingQuery.trim())}
                                </span>
                                <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">
                                  {formatDate(post.createdAt)}
                                </span>
                              </Link>
                            </li>
                          );
                          snippetList.forEach((snippet, i) => {
                            const href = hasHighlight
                              ? `${baseHref}?highlight=${encodeURIComponent(pendingQuery.trim())}&occurrence=${i + 1}`
                              : baseHref;
                            items.push(
                              <li key={`${post.id}-${i}`}>
                                <Link
                                  href={href}
                                  onClick={close}
                                  className="block rounded-lg px-2 py-1 pl-4 text-left text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]/60 hover:text-[var(--foreground)] border-l-2 border-transparent hover:border-[var(--border)] transition-colors duration-150"
                                >
                                  {highlightSnippet(snippet, pendingQuery.trim())}
                                </Link>
                              </li>
                            );
                          });
                          return items;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
