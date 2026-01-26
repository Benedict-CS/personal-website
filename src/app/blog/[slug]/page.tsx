import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TableOfContents } from "@/components/toc";
import { ShareButtons } from "@/components/share-buttons";
import { stripMarkdown } from "@/lib/utils";
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

  return {
    title: post.title,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: `${siteConfig.url}/blog/${slug}`,
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
}: {
  params: Promise<{ slug: string }>;
}) {
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

  return (
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
                  <p className="mb-3 text-sm text-slate-500">
                    Published on {formatDate(post.createdAt)}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
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

                  {/* 分享按鈕 */}
                  <ShareButtons
                    title={post.title}
                    url={`/blog/${post.slug}`}
                    description={stripMarkdown(post.content).substring(0, 100)}
                  />
                </div>

                <MarkdownRenderer content={post.content} />

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
  );
}
