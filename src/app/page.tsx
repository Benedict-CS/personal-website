import type { Metadata } from "next";
import Link from "next/link";
import { Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { siteConfig } from "@/config/site";
import { getSiteConfigForRender } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "Home",
    description: siteConfig.description,
    openGraph: {
      title: "Home",
      description: siteConfig.description,
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
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  ctaContactText?: string;
  ctaContactHref?: string;
  /** Section display order on home page. Default: hero, latestPosts, skills */
  sectionOrder?: string[];
  /** Which sections are visible. Default: all true */
  sectionVisibility?: Record<string, boolean>;
};

const defaultHomeContent: HomeContent = {
  heroTitle: "Hi, I'm Benedict.",
  heroSubtitle: "Network Administrator | Full Stack Developer | Open Source Enthusiast",
  skills: ["Next.js", "TypeScript", "Proxmox", "Linux", "Networking", "Docker"],
  ctaPrimaryText: "Read My Blog",
  ctaPrimaryHref: "/blog",
  ctaSecondaryText: "View Projects",
  ctaSecondaryHref: "/about",
  ctaContactText: "Get in Touch",
  ctaContactHref: "/contact",
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
  const sectionOrder: HomeSectionId[] = Array.isArray(homeContent.sectionOrder) && homeContent.sectionOrder.length > 0
    ? homeContent.sectionOrder.filter((id): id is HomeSectionId => HOME_SECTION_IDS.includes(id as HomeSectionId))
    : [...HOME_SECTION_IDS];
  const sectionVisibility = homeContent.sectionVisibility ?? {};
  const visible = (id: string) => sectionVisibility[id] !== false;

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
      ? "min-h-screen bg-white"
      : templateId === "card"
        ? "min-h-screen bg-slate-100"
        : "min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100";

  const heroSection = (
    <section key="hero" className={`container mx-auto max-w-6xl px-6 ${templateId === "minimal" ? "py-12 md:py-16" : "py-20 md:py-28 lg:py-32"}`}>
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
          {homeContent.heroTitle ?? defaultHomeContent.heroTitle}
        </h1>
        <p className="mb-10 text-lg text-slate-600 sm:text-xl md:text-2xl">
          {homeContent.heroSubtitle ?? defaultHomeContent.heroSubtitle}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href={homeContent.ctaPrimaryHref ?? "/blog"}>
            <Button size="lg" className="w-full sm:w-auto btn-interactive">
              {homeContent.ctaPrimaryText ?? defaultHomeContent.ctaPrimaryText}
            </Button>
          </Link>
          <Link href={homeContent.ctaSecondaryHref ?? "/about"}>
            <Button size="lg" variant="outline" className="w-full sm:w-auto btn-interactive">
              {homeContent.ctaSecondaryText ?? defaultHomeContent.ctaSecondaryText}
            </Button>
          </Link>
          <Link href={homeContent.ctaContactHref ?? "/contact"}>
            <Button size="lg" variant="outline" className="w-full sm:w-auto btn-interactive">
              {homeContent.ctaContactText ?? defaultHomeContent.ctaContactText}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );

  const latestPostsSection = (
    <section key="latestPosts" className="container mx-auto max-w-6xl px-6 py-16">
      <div className="w-full">
        <h2 className="mb-8 text-3xl font-bold text-slate-900">Latest Articles</h2>
        {latestPosts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">More content coming soon...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
                <Card className="h-full card-interactive border-slate-200/80 hover:border-slate-300 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50">
                  <CardHeader className="gap-3">
                    <CardTitle className="line-clamp-2 text-slate-900 leading-relaxed flex items-start gap-1.5">
                      {post.pinned && <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />}
                      <span>{post.title}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{formatDate(post.createdAt)}</span>
                      <span>•</span>
                      <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Link key={tag.id} href={`/blog/tag/${tag.slug}`} className="inline-block">
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-slate-200 hover:scale-105 transition-all" title={`View all posts tagged "${tag.name}"`}>
                              {tag.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
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
    <section key="skills" className="container mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">Technical Skills</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="px-4 py-2 text-sm font-medium text-slate-700">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );

  const sectionMap = { hero: heroSection, latestPosts: latestPostsSection, skills: skillsSection };

  return (
    <div className={wrapperClass}>
      {sectionOrder.map((id) => visible(id) && sectionMap[id]).filter(Boolean)}
    </div>
  );
}
