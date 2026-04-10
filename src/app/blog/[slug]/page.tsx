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
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import { MdxPostBody } from "@/components/mdx/mdx-post-body";
import { shouldRenderAsMdx } from "@/lib/mdx-content-detect";
import { HighlightScroll } from "@/components/highlight-scroll";
import { BackToTop } from "@/components/back-to-top";
import { GiscusComments } from "@/components/giscus-comments";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { publicWidePageContainerClassName } from "@/components/public/public-layout";
import { metaDescriptionFromMarkdown } from "@/lib/meta-description";
import { Pencil } from "lucide-react";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { getSiteConfigForRender } from "@/lib/site-config";
import { extractTocHeadingsFromMarkdown, estimateTocReadingByHeading } from "@/lib/markdown-toc";
import { getContentMetrics } from "@/lib/content-metrics";

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
  const [prevPost, nextPost, relatedCandidates, backlinkPosts] = await Promise.all([
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
    prisma.post.findMany({
      where: {
        ...publishedWhere(),
        id: { not: post.id },
        content: { contains: `/blog/${post.slug}` },
      },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
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
  const tocReadEstimates = Object.fromEntries(
    estimateTocReadingByHeading(post.content).map((item) => [item.id, item.readingMinutes])
  );

  const configForRender = await getSiteConfigForRender();
  const canonicalUrl = `${configForRender.url}/blog/${post.slug}`;
  const baseUrl = configForRender.url.replace(/\/$/, "");
  const ogImageAbsolute = `${baseUrl}/blog/${post.slug}/opengraph-image`;
  const contentMetrics = getContentMetrics(post.content);
  const authorUsesRootPublisher = Boolean(configForRender.authorName?.trim());
  const articleLd = {
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#blogposting`,
    headline: post.title,
    description: metaDescriptionFromMarkdown(post.content, 160) || post.title,
    url: canonicalUrl,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: [ogImageAbsolute],
    wordCount: contentMetrics.words,
    timeRequired: `PT${readingTime}M`,
    ...(post.tags.length > 0 && {
      keywords: post.tags.map((t) => t.name).join(", "),
    }),
    author: authorUsesRootPublisher
      ? { "@id": `${baseUrl}/#publisher` }
      : {
          "@type": "Person",
          name: configForRender.siteName,
        },
    publisher: { "@id": `${baseUrl}/#publisher` },
    // Links to JsonLdRoot WebSite @id (no duplicate WebSite node in this graph).
    isPartOf: { "@id": `${baseUrl}/#website` },
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
      <div className={`${publicWidePageContainerClassName} py-8 sm:py-10 lg:py-12`}>
      <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px] lg:gap-12">
        {/* Main content */}
        <div className="order-2 min-w-0 lg:order-1">
          <Card className="overflow-hidden">
            <CardContent className="px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10 lg:px-8">
              <div className="space-y-8 overflow-hidden">
                <header>
                  <h1 className="font-bold tracking-[-0.03em] text-foreground text-[clamp(1.625rem,1.25rem+1.25vw,2.25rem)]">
                    {post.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Published on {formatDate(post.createdAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{formatReadingTime(readingTime)} read</span>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link key={tag.id} href={`/blog/tag/${tag.slug}`}>
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-accent transition-[background-color,transform] duration-200"
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
                    <MarkdownBodyServer content={post.content} />
                  )}
                </div>
                <HighlightScroll highlight={highlight} occurrence={occurrence} contentSelector="[data-post-content]" />

                {/* Related posts (by tag) */}
                {relatedPosts.length > 0 && (
                  <div className="border-t border-border pt-8">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Related posts
                    </h3>
                    <ul className="space-y-2.5">
                      {relatedPosts.map((r) => (
                        <li key={r.id}>
                          <Link
                            href={`/blog/${r.slug}`}
                            className="text-sm text-foreground/85 underline-offset-2 decoration-transparent hover:text-foreground hover:decoration-foreground/30 transition-[color,text-decoration-color] duration-150"
                          >
                            {r.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {backlinkPosts.length > 0 && (
                  <div className="border-t border-border pt-8">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Referenced in
                    </h3>
                    <ul className="space-y-2.5">
                      {backlinkPosts.map((related) => (
                        <li key={related.id}>
                          <Link
                            href={`/blog/${related.slug}`}
                            className="text-sm text-foreground/85 underline-offset-2 decoration-transparent hover:text-foreground hover:decoration-foreground/30 transition-[color,text-decoration-color] duration-150"
                          >
                            {related.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prev/Next navigation */}
                <div className="border-t border-border pt-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                    {prevPost ? (
                      <Link
                        href={`/blog/${prevPost.slug}`}
                        className="group flex-1 rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 hover:border-muted-foreground/25 hover:shadow-[var(--elevation-2)]"
                      >
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          ← Previous
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-foreground group-hover:text-foreground/90">
                          {prevPost.title}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1" />
                    )}

                    {nextPost ? (
                      <Link
                        href={`/blog/${nextPost.slug}`}
                        className="group flex-1 rounded-xl border border-border bg-card p-4 text-right shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 hover:border-muted-foreground/25 hover:shadow-[var(--elevation-2)]"
                      >
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Next →
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-foreground group-hover:text-foreground/90">
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

                <div className="border-t border-border pt-8 mt-8">
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
            initialReadEstimates={tocReadEstimates}
          />
        </aside>
      </div>
      <BackToTop />
    </div>
    </>
  );
}
