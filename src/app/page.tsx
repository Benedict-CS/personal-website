import type { Metadata } from "next";
import Link from "next/link";
import { Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { getSiteConfigForRender } from "@/lib/site-config";
import { HomeCustomMarkdownSection } from "@/components/home-custom-markdown-section";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const description = config.metaDescription ?? "";
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "Home",
    description: description || undefined,
    alternates: { canonical: config.url },
    openGraph: {
      title: "Home",
      description: description || undefined,
      url: config.url,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

const HOME_SECTION_IDS = ["hero", "latestPosts", "skills"] as const;
type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  skills?: string[];
  sectionTitleLatestPosts?: string;
  sectionTitleSkills?: string;
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  ctaContactText?: string;
  ctaContactHref?: string;
  /** Section display order on home page. May include "markdown_1", "markdown_2", etc. */
  sectionOrder?: string[];
  /** Which sections are visible. Default: all true */
  sectionVisibility?: Record<string, boolean>;
  /** Custom markdown sections (id -> { title?, content }) */
  customSections?: Record<string, { title?: string; content: string }>;
};

const defaultHomeContent: HomeContent = {
  heroTitle: "Hi, I'm Your Name.",
  heroSubtitle: "Builder Owner | Product Creator | Technical Writer",
  skills: ["Next.js", "TypeScript", "Proxmox", "Linux", "Networking", "Docker"],
  ctaPrimaryText: "Read My Blog",
  ctaPrimaryHref: "/blog",
  ctaSecondaryText: "View Projects",
  ctaSecondaryHref: "/about",
  ctaContactText: "Get in Touch",
  ctaContactHref: "/contact",
  sectionTitleLatestPosts: "Latest Articles",
  sectionTitleSkills: "Technical Skills",
};

export default async function Home() {
  const now = new Date();
  const [latestPosts, homeRow, siteConfig] = await Promise.all([
    prisma.post.findMany({
      where: { OR: [{ published: true }, { publishedAt: { lte: now } }] },
      include: { tags: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.sitePageContent.findUnique({ where: { page: "home" } }),
    getSiteConfigForRender(),
  ]);
  const templateId = siteConfig.templateId ?? "default";

  const homeContent: HomeContent = homeRow?.content
    ? { ...defaultHomeContent, ...(homeRow.content as object) }
    : defaultHomeContent;
  const skills = Array.isArray(homeContent.skills) && homeContent.skills.length > 0
    ? homeContent.skills
    : defaultHomeContent.skills!;
  const sectionOrder: string[] = Array.isArray(homeContent.sectionOrder) && homeContent.sectionOrder.length > 0
    ? homeContent.sectionOrder
    : [...HOME_SECTION_IDS];
  const sectionVisibility = homeContent.sectionVisibility ?? {};
  const visible = (id: string) => sectionVisibility[id] !== false;
  const customSections = homeContent.customSections ?? {};

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  const wrapperClass =
    templateId === "minimal"
      ? "min-h-screen bg-[var(--background)]"
      : templateId === "card"
        ? "min-h-screen bg-[var(--muted)]"
        : "min-h-screen bg-gradient-to-br from-[var(--muted)] via-[var(--background)] to-[var(--muted)]";

  const heroSection = (
    <section
      key="hero"
      data-home-section="hero"
      className={`container mx-auto max-w-6xl px-6 ${templateId === "minimal" ? "py-12 md:py-16" : "py-20 md:py-28 lg:py-32"}`}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl lg:text-7xl">
          <span data-inline-field="home.heroTitle">{homeContent.heroTitle ?? defaultHomeContent.heroTitle}</span>
        </h1>
        <p className="mb-10 text-lg text-[var(--muted-foreground)] sm:text-xl md:text-2xl">
          <span data-inline-field="home.heroSubtitle">{homeContent.heroSubtitle ?? defaultHomeContent.heroSubtitle}</span>
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href={homeContent.ctaPrimaryHref ?? "/blog"} data-editor-button="home.ctaPrimary">
            <Button size="lg" className="w-full sm:w-auto btn-interactive">
              <span data-inline-field="home.ctaPrimaryText" data-editor-button-label>
                {homeContent.ctaPrimaryText ?? defaultHomeContent.ctaPrimaryText}
              </span>
            </Button>
          </Link>
          <Link href={homeContent.ctaSecondaryHref ?? "/about"} data-editor-button="home.ctaSecondary">
            <Button size="lg" variant="outline" className="w-full sm:w-auto btn-interactive">
              <span data-inline-field="home.ctaSecondaryText" data-editor-button-label>
                {homeContent.ctaSecondaryText ?? defaultHomeContent.ctaSecondaryText}
              </span>
            </Button>
          </Link>
          <Link href={homeContent.ctaContactHref ?? "/contact"} data-editor-button="home.ctaContact">
            <Button size="lg" variant="outline" className="w-full sm:w-auto btn-interactive">
              <span data-inline-field="home.ctaContactText" data-editor-button-label>
                {homeContent.ctaContactText ?? defaultHomeContent.ctaContactText}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );

  const latestPostsSection = (
    <section key="latestPosts" data-home-section="latestPosts" className="container mx-auto max-w-6xl px-6 py-16">
      <div className="w-full">
        <h2 className="mb-8 text-3xl font-bold text-[var(--foreground)]" data-inline-field="home.sectionTitleLatestPosts">
          {homeContent.sectionTitleLatestPosts ?? defaultHomeContent.sectionTitleLatestPosts}
        </h2>
        {latestPosts.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-card p-12 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[var(--muted-foreground)]">More content coming soon...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
                <Card className="h-full border-[var(--border)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[oklch(0.91_0.012_255)]">
                  <CardHeader className="gap-3">
                    <CardTitle className="line-clamp-2 text-[var(--foreground)] leading-relaxed flex items-start gap-1.5">
                      {post.pinned && <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />}
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
                          <Link key={tag.id} href={`/blog/tag/${tag.slug}`} className="inline-block">
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-[var(--accent)] transition-colors duration-150" title={`View all posts tagged "${tag.name}"`}>
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
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const skillsSection = (
    <section key="skills" data-home-section="skills" className="container mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-[var(--foreground)]" data-inline-field="home.sectionTitleSkills">
          {homeContent.sectionTitleSkills ?? defaultHomeContent.sectionTitleSkills}
        </h2>
        <div className="flex flex-wrap justify-center gap-3" data-home-skills-container>
          {skills.map((skill, index) => (
            <Badge key={`${skill}-${index}`} variant="secondary" className="px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              <span data-inline-field={`home.skills.${index}`}>{skill}</span>
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );

  const sectionMap: Record<string, React.ReactNode> = {
    hero: heroSection,
    latestPosts: latestPostsSection,
    skills: skillsSection,
  };

  return (
    <div className={wrapperClass}>
      {sectionOrder
        .filter((id) => visible(id))
        .map((id) => {
          if (sectionMap[id]) return <div key={id}>{sectionMap[id]}</div>;
          if (id.startsWith("markdown_") && customSections[id]) {
            const { title, content } = customSections[id];
            return (
              <HomeCustomMarkdownSection
                key={id}
                id={id}
                title={title}
                content={content ?? ""}
              />
            );
          }
          return null;
        })}
    </div>
  );
}
