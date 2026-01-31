import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableOfContents } from "@/components/toc";
import { ShareButtons } from "@/components/share-buttons";
import { ReadingProgress } from "@/components/reading-progress";
import { PrevNextKeys } from "@/components/prev-next-keys";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { HighlightScroll } from "@/components/highlight-scroll";
import { stripMarkdown } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { siteConfig } from "@/config/site";

// Force dynamic rendering to avoid build-time database connection
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: {
      slug: slug,
      published: true,
    },
    include: {
      tags: true,
    },
  });

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const description = stripMarkdown(post.content).substring(0, 160) + "...";

  const canonicalUrl = `${siteConfig.url}/blog/${slug}`;

  return {
    title: post.title,
    description: description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description: description,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      images: [siteConfig.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const highlight = typeof resolvedSearch?.highlight === "string" ? resolvedSearch.highlight : undefined;
  const occurrenceRaw = resolvedSearch?.occurrence;
  const occurrence = Array.isArray(occurrenceRaw) ? occurrenceRaw[0] : occurrenceRaw;
  
  // Check if user is logged in
  const session = await getServerSession(authOptions);

  const post = await prisma.post.findFirst({
    where: {
      slug: slug,
      published: true,
    },
    include: {
      tags: true,
    },
  });

  if (!post) {
    notFound();
  }

  // 查詢上一篇和下一篇文章
  const [prevPost, nextPost] = await Promise.all([
    // 上一篇：createdAt 比當前文章小，按 createdAt 降序取第一個
    prisma.post.findFirst({
      where: {
        published: true,
        createdAt: {
          lt: post.createdAt,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
    // 下一篇：createdAt 比當前文章大，按 createdAt 升序取第一個
    prisma.post.findFirst({
      where: {
        published: true,
        createdAt: {
          gt: post.createdAt,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
  ]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const readingTime = calculateReadingTime(post.content);

  const canonicalUrl = `${siteConfig.url}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: stripMarkdown(post.content).substring(0, 160),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}${siteConfig.ogImage}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />
      <PrevNextKeys
        prevHref={prevPost ? `/blog/${prevPost.slug}` : null}
        nextHref={nextPost ? `/blog/${nextPost.slug}` : null}
      />
      <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_250px]">
        {/* 主要內容區 */}
        <div className="min-w-0">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6 overflow-hidden">
                <div>
                  <h1 className="mb-4 text-4xl font-bold text-slate-900">
                    {post.title}
                  </h1>
                  <div className="mb-3 flex items-center gap-4 text-sm text-slate-500">
                    <span>Published on {formatDate(post.createdAt)}</span>
                    <span>•</span>
                    <span>{formatReadingTime(readingTime)}</span>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link key={tag.id} href={`/blog/tag/${tag.slug}`}>
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

                  {/* Share buttons */}
                  <ShareButtons
                    title={post.title}
                    url={`/blog/${post.slug}`}
                    description={stripMarkdown(post.content).substring(0, 100)}
                  />

                  {/* Edit button for logged in users */}
                  {session && (
                    <div className="pt-2">
                      <Link href={`/dashboard/posts/${post.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div data-post-content>
                  <MarkdownRenderer content={post.content} postId={post.id} editable={!!session} />
                </div>
                <HighlightScroll highlight={highlight} occurrence={occurrence} contentSelector="[data-post-content]" />

                {/* 上一篇/下一篇導覽 */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                    {prevPost ? (
                      <Link
                        href={`/blog/${prevPost.slug}`}
                        className="group flex-1 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="text-sm text-slate-500">
                          ← Previous
                        </div>
                        <div className="mt-1 font-medium text-slate-900 group-hover:text-slate-700">
                          {prevPost.title}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1" />
                    )}

                    {nextPost ? (
                      <Link
                        href={`/blog/${nextPost.slug}`}
                        className="group flex-1 rounded-lg border border-slate-200 bg-white p-4 text-right transition-all hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="text-sm text-slate-500">
                          Next →
                        </div>
                        <div className="mt-1 font-medium text-slate-900 group-hover:text-slate-700">
                          {nextPost.title}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/blog">
                    <Button variant="outline">Back to Blog</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 目錄側邊欄 */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <TableOfContents content={post.content} />
        </aside>
      </div>
    </div>
    </>
  );
}
