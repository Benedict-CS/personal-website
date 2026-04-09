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
import { ArticleReadingChrome } from "@/components/article-reading-chrome";
import { PrevNextKeys } from "@/components/prev-next-keys";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { MdxPostBody } from "@/components/mdx/mdx-post-body";
import { shouldRenderAsMdx } from "@/lib/mdx-content-detect";
import { HighlightScroll } from "@/components/highlight-scroll";
import { BackToTop } from "@/components/back-to-top";
import { GiscusComments } from "@/components/giscus-comments";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { metaDescriptionFromMarkdown } from "@/lib/meta-description";
import { Pencil } from "lucide-react";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { getSiteConfigForRender } from "@/lib/site-config";
import { extractTocHeadingsFromMarkdown } from "@/lib/markdown-toc";

export const revalidate = 60;

function publishedWhere() {
  const now = new Date();
  return {
    OR: [
      { published: true },
      { publishedAt: { lte: now } },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: {
      slug: slug,
      ...publishedWhere(),
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

  const config = await getSiteConfigForRender();
  const description = metaDescriptionFromMarkdown(post.content, 160);
  const canonicalUrl = `${config.url}/blog/${slug}`;
  const tagNames = post.tags.map((t) => t.name).filter(Boolean);

  return {
    title: post.title,
    description: description || undefined,
    alternates: { canonical: canonicalUrl },
    ...(tagNames.length > 0 && { keywords: tagNames }),
    openGraph: {
      title: post.title,
      description: description || undefined,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      images: [{ url: `${config.url}/blog/${slug}/opengraph-image`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description || undefined,
      images: [`${config.url}/blog/${slug}/opengraph-image`],
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
      ...publishedWhere(),
    },
    include: {
      tags: true,
    },
  });

  if (!post) {
    notFound();
  }

  // Prev/next and related (by tag)
  const tagIds = post.tags.map((t) => t.id);
  const [prevPost, nextPost, relatedCandidates] = await Promise.all([
    prisma.post.findFirst({
      where: {
        ...publishedWhere(),
        createdAt: { lt: post.createdAt },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true },
    }),
    prisma.post.findFirst({
      where: {
        ...publishedWhere(),
        createdAt: { gt: post.createdAt },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, slug: true },
    }),
    tagIds.length > 0
      ? prisma.post.findMany({
          where: {
            ...publishedWhere(),
            id: { not: post.id },
            tags: { some: { id: { in: tagIds } } },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
            tags: { select: { id: true } },
          },
          take: 24,
        })
      : Promise.resolve([]),
  ]);

  const relatedPosts =
    tagIds.length === 0
      ? []
      : relatedCandidates
          .map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            score: p.tags.filter((t) => tagIds.includes(t.id)).length,
            updatedAt: p.updatedAt.getTime(),
          }))
          .sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
          .slice(0, 5)
          .map(({ id, title, slug }) => ({ id, title, slug }));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const readingTime = calculateReadingTime(post.content);
  const tocHeadings = extractTocHeadingsFromMarkdown(post.content);

  const configForRender = await getSiteConfigForRender();
  const canonicalUrl = `${configForRender.url}/blog/${post.slug}`;
  const publisherLogoUrl = configForRender.ogImageUrl
    ? (configForRender.ogImageUrl.startsWith("http")
        ? configForRender.ogImageUrl
        : new URL(configForRender.ogImageUrl, configForRender.url).toString())
    : undefined;
  const baseUrl = configForRender.url.replace(/\/$/, "");
  const articleLd = {
    "@type": "Article",
    headline: post.title,
    description: metaDescriptionFromMarkdown(post.content, 160) || post.title,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: configForRender.authorName ?? configForRender.siteName,
    },
    publisher: {
      "@type": "Organization",
      name: configForRender.siteName,
      ...(publisherLogoUrl && {
        logo: { "@type": "ImageObject", url: publisherLogoUrl },
      }),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };
  const breadcrumbLd = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };
  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [articleLd, breadcrumbLd],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <ArticleReadingChrome title={post.title} />
      <PrevNextKeys
        prevHref={prevPost ? `/blog/${prevPost.slug}` : null}
        nextHref={nextPost ? `/blog/${nextPost.slug}` : null}
      />
      <div className="container mx-auto max-w-[120rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px] lg:gap-12">
        {/* Main content */}
        <div className="order-2 min-w-0 lg:order-1">
          <Card className="overflow-hidden">
            <CardContent className="px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10 lg:px-8">
              <div className="space-y-8 overflow-hidden">
                <header>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {post.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>Published on {formatDate(post.createdAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{formatReadingTime(readingTime)} read</span>
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

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <ShareButtons
                      title={post.title}
                      url={`/blog/${post.slug}`}
                      description={metaDescriptionFromMarkdown(post.content, 100)}
                    />
                  </div>

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
                </header>

                <div
                  data-post-content
                  className="prose-reading prose-reading-article mx-auto mt-8 w-full max-w-[70ch]"
                >
                  {shouldRenderAsMdx(post.content) ? (
                    <MdxPostBody content={post.content} postId={post.id} editable={!!session} />
                  ) : (
                    <MarkdownRenderer content={post.content} postId={post.id} editable={!!session} />
                  )}
                </div>
                <HighlightScroll highlight={highlight} occurrence={occurrence} contentSelector="[data-post-content]" />

                {/* Related posts (by tag) */}
                {relatedPosts.length > 0 && (
                  <div className="border-t border-slate-200 pt-8">
                    <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
                      Related posts
                    </h3>
                    <ul className="space-y-2">
                      {relatedPosts.map((r) => (
                        <li key={r.id}>
                          <Link
                            href={`/blog/${r.slug}`}
                            className="text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            {r.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prev/Next navigation */}
                <div className="border-t border-slate-200 pt-8">
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

                <div className="pt-6">
                  <Link href="/blog">
                    <Button variant="outline" size="sm">Back to Blog</Button>
                  </Link>
                </div>

                <div className="border-t border-slate-200 pt-8 mt-8">
                  <GiscusComments mapping="pathname" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOC: mobile first in layout; sticky sidebar on large screens */}
        <aside className="order-1 w-full lg:sticky lg:top-20 lg:order-2 lg:w-[260px] lg:self-start">
          <TableOfContents
            key={post.id}
            content={post.content}
            initialHeadings={tocHeadings}
          />
        </aside>
      </div>
      <BackToTop />
    </div>
    </>
  );
}
