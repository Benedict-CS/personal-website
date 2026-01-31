"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  snippet: string | null;
}

interface SearchPage {
  path: string;
  title: string;
  snippet: string;
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
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setPendingQuery("");
      setResult({ posts: [], pages: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!pendingQuery.trim()) {
      setResult({ posts: [], pages: [] });
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(pendingQuery.trim())}`)
      .then((res) => (res.ok ? res.json() : { posts: [], pages: [] }))
      .then((data: SearchResult) => setResult({ posts: data.posts || [], pages: data.pages || [] }))
      .catch(() => setResult({ posts: [], pages: [] }))
      .finally(() => setLoading(false));
  }, [pendingQuery]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPendingQuery(value);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
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
      i % 2 === 1 ? <mark key={i} className="bg-amber-200/80 rounded px-0.5">{part}</mark> : part
    );
  }

  const hasResults = result.posts.length > 0 || result.pages.length > 0;
  const hasQuery = pendingQuery.trim().length > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm"
        onClick={() => setOpen(!open)}
        aria-label="Search site"
      >
        <Search className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Search</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            className="absolute right-0 top-full z-[100] mt-1 w-[min(90vw,28rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 p-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search blog & site (e.g. NYCU, proxy)..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
                autoComplete="off"
              />
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0" onClick={close} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading && (
                <p className="py-6 text-center text-sm text-slate-500">Searching...</p>
              )}
              {!loading && hasQuery && !hasResults && (
                <p className="py-6 text-center text-sm text-slate-500">No results for &quot;{pendingQuery}&quot;</p>
              )}
              {!loading && !hasQuery && (
                <p className="py-4 px-3 text-sm text-slate-500">
                  Search blog posts and site pages (About, Contact, Home).
                </p>
              )}
              {!loading && hasResults && (
                <div className="py-2">
                  {result.pages.length > 0 && (
                    <div className="px-3 pb-2">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-slate-400">
                        <Globe className="h-3.5 w-3.5" /> Pages
                      </p>
                      <ul className="space-y-1">
                        {result.pages.map((page) => {
                          const pageHref =
                            page.path +
                            (pendingQuery.trim()
                              ? `?highlight=${encodeURIComponent(pendingQuery.trim())}`
                              : "");
                          return (
                          <li key={page.path}>
                            <Link
                              href={pageHref}
                              onClick={close}
                              className="block rounded-md px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-50"
                            >
                              <span className="font-medium">{page.title}</span>
                              {page.snippet && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                  {highlightSnippet(page.snippet, pendingQuery.trim())}
                                </p>
                              )}
                            </Link>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {result.posts.length > 0 && (
                    <div className="px-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-slate-400">
                        <FileText className="h-3.5 w-3.5" /> Blog
                      </p>
                      <ul className="space-y-1">
                        {result.posts.map((post) => {
                          const href =
                            pendingQuery.trim()
                              ? `/blog/${post.slug}?highlight=${encodeURIComponent(pendingQuery.trim())}`
                              : `/blog/${post.slug}`;
                          return (
                            <li key={post.id}>
                              <Link
                                href={href}
                                onClick={close}
                                className="block rounded-md px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-50"
                              >
                                <span className="font-medium">
                                  {highlightSnippet(post.title, pendingQuery.trim())}
                                </span>
                                <span className="ml-1.5 text-xs text-slate-400">
                                  {formatDate(post.createdAt)}
                                </span>
                                {(post.snippet || post.description) && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                    {highlightSnippet(
                                      post.snippet || post.description || "",
                                      pendingQuery.trim()
                                    )}
                                  </p>
                                )}
                              </Link>
                            </li>
                          );
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
