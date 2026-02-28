import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableOfContents } from "@/components/toc";
import { ReadingProgress } from "@/components/reading-progress";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";

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
    notFound();
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

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const readingTime = calculateReadingTime(post.content);

  return (
    <>
      <ReadingProgress />
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
                    <h1 className="mb-4 text-4xl font-bold text-slate-900">
                      {post.title}
                    </h1>
                    <div className="mb-3 flex items-center gap-4 text-sm text-slate-500">
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

                  <div data-post-content>
                    <MarkdownRenderer content={post.content} postId={post.id} editable={false} />
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <Link href="/blog">
                      <Button variant="outline">Back to Blog</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <TableOfContents content={post.content} />
          </aside>
        </div>
      </div>
    </>
  );
}
