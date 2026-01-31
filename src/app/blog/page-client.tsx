"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Pin, Search, X, List, Calendar, Rss } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  description: string | null;
  published: boolean;
  pinned: boolean;
  createdAt: Date;
  tags: Array<{ id: string; name: string; slug: string }>;
}

export default function BlogPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "archive">(
    (searchParams.get("view") as "list" | "archive") || "list"
  );

  const SEARCH_DEBOUNCE_MS = 300;

  useEffect(() => {
    const q = searchParams.get("search") || "";
    setSearchQuery(q);
    setInputValue(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("published", "true");
        if (searchQuery) params.set("search", searchQuery);

        const response = await fetch(`/api/posts?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [searchQuery]);

  const handleSearch = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
        const params = new URLSearchParams();
        if (value) params.set("search", value);
        router.push(`/blog?${params.toString()}`);
        debounceRef.current = null;
      }, SEARCH_DEBOUNCE_MS);
    },
    [router]
  );

  const clearSearch = () => {
    setInputValue("");
    setSearchQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    router.push("/blog");
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    const plainText = stripMarkdown(content);
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + "...";
  };

  // 按年份分組（用於 Archive 視圖）
  const postsByYear = useMemo(() => {
    const grouped: Record<number, Post[]> = {};
    posts.forEach((post) => {
      const year = new Date(post.createdAt).getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(post);
    });
    return grouped;
  }, [posts]);

  const years = useMemo(() => {
    return Object.keys(postsByYear)
      .map(Number)
      .sort((a, b) => b - a);
  }, [postsByYear]);

  const handleViewModeChange = (mode: "list" | "archive") => {
    setViewMode(mode);
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (mode !== "list") params.set("view", mode);
    router.push(`/blog?${params.toString()}`);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-slate-900">Blog</h1>
        {/* 視圖切換 */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "archive" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("archive")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {/* 搜尋框 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by title, content, description, tags (full-text)..."
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {inputValue && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subscribe via RSS */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-600">
        <Rss className="h-4 w-4 flex-shrink-0" />
        <span>Subscribe via RSS:</span>
        <Link
          href="/feed.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-800 underline hover:text-slate-900"
        >
          feed.xml
        </Link>
        <span className="text-slate-500">— Add this URL to Feedly, Inoreader, or any RSS reader to get new posts.</span>
      </div>

      {/* Search result summary */}
      {searchQuery && (
        <div className="mb-4 space-y-1 text-sm text-slate-600">
          <p>
            Found {posts.length} {posts.length === 1 ? "post" : "posts"}.
          </p>
          <p className="text-slate-500">
            Searched in title, content, description, and tags. Results ordered by relevance.
          </p>
        </div>
      )}

      {/* 文章列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">
            {searchQuery ? "No posts found matching your search" : "No posts available yet."}
          </p>
        </div>
      ) : viewMode === "archive" ? (
        // Archive 視圖：按年份分組
        <div className="space-y-12">
          {years.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">No posts available yet.</p>
            </div>
          ) : (
            years.map((year) => (
              <div key={year}>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                  {year}
                  <span className="ml-3 text-lg font-normal text-slate-500">
                    ({postsByYear[year].length} {postsByYear[year].length === 1 ? "post" : "posts"})
                  </span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {postsByYear[year].map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card className="h-full transition-shadow hover:shadow-lg">
                        <CardHeader className="gap-3">
                          <CardTitle className="line-clamp-2 text-slate-900 leading-relaxed flex items-start gap-1.5">
                            {post.pinned && (
                              <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
                            )}
                            <span>{post.title}</span>
                          </CardTitle>
                          <p className="text-sm text-slate-500">
                            {formatDate(post.createdAt)}
                          </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {post.tags.map((tag) => (
                                <Link
                                  key={tag.id}
                                  href={`/blog/tag/${tag.slug}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-slate-200 hover:scale-105 transition-all"
                                    title={`View all posts tagged "${tag.name}"`}
                                  >
                                    {tag.name}
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                            {post.description || truncateContent(post.content)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // List 視圖：一般列表
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="gap-3">
                  <CardTitle className="line-clamp-2 text-slate-900 leading-relaxed flex items-start gap-1.5">
                    {post.pinned && (
                      <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
                    )}
                    <span>{post.title}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{formatDate(post.createdAt)}</span>
                    <span>•</span>
                    <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/blog/tag/${tag.slug}`}
                          className="inline-block"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-slate-200 hover:scale-105 transition-all"
                            title={`View all posts tagged "${tag.name}"`}
                          >
                            {tag.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {post.description || truncateContent(post.content)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
