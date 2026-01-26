import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { stripMarkdown } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}): Promise<Metadata> {
  const { tagSlug } = await params;
  const decodedSlug = decodeURIComponent(tagSlug);
  
  const tag = await prisma.tag.findUnique({
    where: { slug: decodedSlug },
  });

  if (!tag) {
    return {
      title: "Tag Not Found",
    };
  }

  return {
    title: `Tag: ${tag.name} | ${siteConfig.name}`,
    description: `All posts tagged with "${tag.name}"`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}) {
  const { tagSlug } = await params;
  const decodedSlug = decodeURIComponent(tagSlug);

  const tag = await prisma.tag.findUnique({
    where: { slug: decodedSlug },
    include: {
      posts: {
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
      },
    },
  });

  if (!tag) {
    notFound();
  }

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
        <h1 className="text-4xl font-bold text-slate-900 mt-4">
          Tag: <span className="text-slate-600">{tag.name}</span>
        </h1>
        <p className="text-slate-600 mt-2">
          {tag.posts.length} {tag.posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      {tag.posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">No posts found with this tag.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tag.posts.map((post) => (
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
                      {post.tags.map((t) => (
                        <Badge
                          key={t.id}
                          variant={t.id === tag.id ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {t.name}
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
      )}
    </div>
  );
}
