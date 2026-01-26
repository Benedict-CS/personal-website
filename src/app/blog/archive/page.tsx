import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { stripMarkdown } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Archive | ${siteConfig.name}`,
  description: "Browse all blog posts by year",
};

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

  // 按年份分組
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.createdAt).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof posts>);

  // 按年份降序排列
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
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <Link
          href="/blog"
          className="text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4 inline-block"
        >
          ← Back to Blog
        </Link>
        <h1 className="text-4xl font-bold text-slate-900 mt-4">Archive</h1>
        <p className="text-slate-600 mt-2">
          {posts.length} {posts.length === 1 ? "post" : "posts"} in total
        </p>
      </div>

      {years.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">No posts available yet.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {years.map((year) => (
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
                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                          {/* @ts-ignore */}
                          {post.description || truncateContent(post.content)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
