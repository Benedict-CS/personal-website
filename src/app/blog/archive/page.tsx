import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { getSiteConfigForRender } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const base = config.url.replace(/\/$/, "");
  const desc = "Browse all blog posts by year.";
  const path = `${base}/blog/archive`;
  return {
    title: `Archive | ${config.siteName}`,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title: `Archive | ${config.siteName}`,
      description: desc,
      url: path,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Archive | ${config.siteName}`,
      description: desc,
    },
  };
}

export default async function ArchivePage() {
  const posts = await prisma.post.findMany({
    where: {
      published: true,
    },
    include: {
      tags: true,
    },
    orderBy: [
      { pinned: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Group by year
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.createdAt).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof posts>);

  // Sort years descending
  const years = Object.keys(postsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mb-8">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Back to Blog
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4 sm:text-4xl">Archive</h1>
        <p className="text-muted-foreground mt-2">
          {posts.length} {posts.length === 1 ? "post" : "posts"} in total
        </p>
      </div>

      {years.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-card p-12 text-center shadow-[var(--elevation-1)]">
          <p className="text-muted-foreground">No posts available yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="text-2xl font-bold text-foreground mb-5 pb-2 border-b border-border sm:text-3xl">
                {year}
                <span className="ml-3 text-lg font-normal text-muted-foreground">
                  ({postsByYear[year].length} {postsByYear[year].length === 1 ? "post" : "posts"})
                </span>
              </h2>
              <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {postsByYear[year].map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl transition-opacity hover:opacity-95">
                    <Card className="h-full border-[var(--border)] shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 hover:shadow-[var(--elevation-2)] hover:border-muted-foreground/25">
                      <CardHeader className="gap-2 p-5 sm:gap-3 sm:p-6">
                        <CardTitle className="line-clamp-2 text-foreground leading-relaxed flex items-start gap-1.5">
                          {post.pinned && (
                            <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
                          )}
                          <span>{post.title}</span>
                        </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(post.createdAt)}</span>
                            <span>•</span>
                            <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {post.description || truncateContent(post.content)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
