"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Pin, Rss } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { BackToTop } from "@/components/back-to-top";
import { Badge } from "@/components/ui/badge";
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

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export default function BlogPageClient() {
  const TAG_LIMIT = 10;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [randomTags, setRandomTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const activeTag = searchParams.get("tag") || null;

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/tags");
        if (res.ok) {
          const data = await res.json();
          setTags(data);
          const shuffled = [...data]
            .map((tag: TagItem) => ({ tag, sort: Math.random() }))
            .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
            .map((entry: { tag: TagItem }) => entry.tag);
          setRandomTags(shuffled.slice(0, TAG_LIMIT));
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setTagsLoading(false);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("published", "true");
        if (activeTag) params.set("tag", activeTag);

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
  }, [activeTag]);

  const setTagFilter = (slug: string | null) => {
    if (!slug) {
      router.push("/blog");
      return;
    }
    router.push(`/blog?tag=${slug}`);
  };

  const visibleTags = useMemo(() => {
    const sample = randomTags.length > 0 ? randomTags : tags.slice(0, TAG_LIMIT);
    if (!activeTag || sample.some((tag) => tag.slug === activeTag)) return sample;
    const active = tags.find((tag) => tag.slug === activeTag);
    if (!active) return sample;
    return [...sample.slice(0, Math.max(0, TAG_LIMIT - 1)), active];
  }, [activeTag, randomTags, tags]);

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

  // Group by year (for Archive view)
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Blog</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">Articles and notes by topic.</p>
      </div>

      {/* Tag filter: All + tag buttons */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--foreground)] mb-2">Filter by tag (random 10)</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTag === null ? "default" : "outline"}
            size="sm"
            onClick={() => setTagFilter(null)}
            className="min-h-[44px] min-w-[44px] sm:min-w-0 rounded-full px-4"
          >
            All
          </Button>
          {tagsLoading ? (
            <span className="text-sm text-[var(--muted-foreground)] py-2">Loading tags…</span>
          ) : (
            visibleTags.map((tag) => (
              <Button
                key={tag.id}
                variant={activeTag === tag.slug ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter(tag.slug)}
                className="min-h-[44px] rounded-full px-4"
              >
                {tag.name}
              </Button>
            ))
          )}
        </div>
      </div>

      {/* Subscribe via RSS */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Rss className="h-4 w-4 flex-shrink-0" />
        <span>Subscribe via RSS:</span>
        <Link
          href="/feed.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--foreground)] underline hover:text-[var(--primary)]"
        >
          feed.xml
        </Link>
        <span>— Add this URL to Feedly, Inoreader, or any RSS reader to get new posts.</span>
      </div>

      {activeTag && (
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          {posts.length} {posts.length === 1 ? "post" : "posts"} with this tag.
        </p>
      )}

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-12 animate-pulse">
          {[1, 2].map((block) => (
            <div key={block}>
              <div className="h-8 w-24 rounded bg-[var(--muted)] mb-6" />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-sm)]">
                    <div className="h-6 w-3/4 rounded bg-[var(--muted)] mb-3" />
                    <div className="h-4 w-32 rounded bg-[var(--muted)]/80 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <div className="h-5 w-14 rounded-full bg-[var(--muted)]/70" />
                      <div className="h-5 w-16 rounded-full bg-[var(--muted)]/70" />
                    </div>
                    <div className="h-4 w-full rounded bg-[var(--muted)]/70" />
                    <div className="h-4 w-2/3 rounded bg-[var(--muted)]/70 mt-2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-card p-12 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[var(--foreground)] font-medium">
            {activeTag ? "No posts with this tag yet." : "No posts yet."}
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {activeTag ? "Try another tag or view all posts." : "Subscribe via RSS (link above) to get notified when new posts are published."}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-3xl font-bold text-[var(--foreground)] mb-6 pb-2 border-b border-[var(--border)]">
                {year}
                <span className="ml-3 text-lg font-normal text-[var(--muted-foreground)]">
                  ({postsByYear[year].length} {postsByYear[year].length === 1 ? "post" : "posts"})
                </span>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {postsByYear[year].map((post, cardIndex) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(cardIndex * 0.05, 0.25), ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Link href={`/blog/${post.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
                      <Card className="h-full border-[var(--border)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[oklch(0.91_0.012_255)]">
                        <CardHeader className="gap-3">
                          <CardTitle className="line-clamp-2 text-[var(--foreground)] leading-relaxed flex items-start gap-1.5">
                            {post.pinned && (
                              <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
                            )}
                            <span>{post.title}</span>
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-[var(--accent)] transition-colors duration-150"
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
                          <p className="text-sm text-[var(--muted-foreground)] line-clamp-3 leading-relaxed">
                            {post.description || truncateContent(post.content)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <BackToTop />
    </div>
  );
}
