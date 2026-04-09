import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableOfContents } from "@/components/toc";
import { ArticleReadingChrome } from "@/components/article-reading-chrome";
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import { MdxPostBody } from "@/components/mdx/mdx-post-body";
import { shouldRenderAsMdx } from "@/lib/mdx-content-detect";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { extractTocHeadingsFromMarkdown } from "@/lib/markdown-toc";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft Preview",
  robots: "noindex, nofollow",
};

interface PreviewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BlogPreviewPage({ searchParams }: PreviewPageProps) {
  const resolved = await searchParams;
  const token =
    typeof resolved?.token === "string" ? resolved.token : undefined;

  if (!token) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)] sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">Draft preview</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            A valid preview URL includes a secret token in the query string. Open your post in the dashboard and use
            &quot;Copy preview link&quot; to generate a read-only link you can share.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            If you opened this page without a token, nothing is wrong—this route only serves draft previews when the
            token is present.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/posts">
              <Button>Go to posts</Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline">Back to blog</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const post = await prisma.post.findUnique({
    where: { previewToken: token },
    include: { tags: true },
  });

  if (!post) {
    notFound();
  }

  // Optional: preview link expiry (previewTokenExpiresAt)
  const expiresAt = (post as { previewTokenExpiresAt?: Date | null }).previewTokenExpiresAt;
  if (expiresAt && new Date() > new Date(expiresAt)) {
    notFound();
  }

  const tocHeadings = extractTocHeadingsFromMarkdown(post.content);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const readingTime = calculateReadingTime(post.content);

  return (
    <>
      <ArticleReadingChrome title={post.title} />
      <div className="container mx-auto max-w-[90rem] px-4 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_250px]">
          <div className="min-w-0">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6 overflow-hidden">
                  <div>
                    <div className="mb-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Draft preview — read-only link
                      </Badge>
                    </div>
                    <h1 className="mb-4 text-4xl font-bold text-foreground">
                      {post.title}
                    </h1>
                    <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Last updated {formatDate(post.updatedAt)}</span>
                      <span>•</span>
                      <span>{formatReadingTime(readingTime)}</span>
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span key={tag.id}>
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-default"
                            >
                              {tag.name}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    data-post-content
                    className="prose-reading prose-reading-article mx-auto w-full max-w-[70ch]"
                  >
                    {shouldRenderAsMdx(post.content) ? (
                      <MdxPostBody content={post.content} postId={post.id} editable={false} />
                    ) : (
                      <MarkdownBodyServer content={post.content} />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                    <Link href={`/dashboard/posts/${post.id}`}>
                      <Button>Edit in dashboard</Button>
                    </Link>
                    <Link href="/blog">
                      <Button variant="outline">Back to blog</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <TableOfContents content={post.content} initialHeadings={tocHeadings} />
          </aside>
        </div>
      </div>
    </>
  );
}
