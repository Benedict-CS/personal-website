import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteConfigForRender } from "@/lib/site-config";
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isCustomPagePublicOnSite,
  stripCustomPageDecoratorsForSeo,
  stripScheduledPublishAt,
} from "@/lib/custom-page-schedule";
import { metaDescriptionFromMarkdown } from "@/lib/meta-description";
import { buildSocialShareCardUrl } from "@/lib/social-share-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug: slug.toLowerCase().trim() },
    select: { title: true, published: true, content: true },
  });
  if (!page) return { title: "Not Found" };
  if (!isCustomPagePublicOnSite(page.published, page.content)) return { title: "Not Found" };
  const config = await getSiteConfigForRender();
  const canonicalPath = `/page/${encodeURIComponent(slug)}`;
  const canonicalUrl = `${config.url.replace(/\/$/, "")}${canonicalPath}`;
  const description = metaDescriptionFromMarkdown(stripCustomPageDecoratorsForSeo(page.content ?? ""), 160);
  const ogPath = buildSocialShareCardUrl({
    title: page.title,
    subtitle: description || canonicalPath,
    label: "Custom Page",
    theme: "slate",
  });
  const ogUrl = `${config.url.replace(/\/$/, "")}${ogPath}`;
  return {
    title: page.title,
    description: description || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: page.title,
      description: description || undefined,
      url: canonicalUrl,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: description || undefined,
      images: [ogUrl],
    },
  };
}

export default async function CustomPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug: slug.toLowerCase().trim() },
  });
  if (!page) notFound();
  if (!isCustomPagePublicOnSite(page.published, page.content)) notFound();
  const cleanContent = stripScheduledPublishAt(page.content);
  const themeMatch = cleanContent.match(/^<!--\s*site-theme:(clean|soft|bold)\s*-->\s*\n?/i);
  const pageTheme = (themeMatch?.[1]?.toLowerCase() as "clean" | "soft" | "bold" | undefined) ?? "clean";
  const withoutTheme = themeMatch ? cleanContent.replace(themeMatch[0], "") : cleanContent;
  const brandMatch = withoutTheme.match(/^<!--\s*site-brand:(\{[\s\S]*?\})\s*-->\s*\n?/i);
  let brand = {
    brandName: "",
    brandLogoUrl: "",
    primaryColor: "#0f172a",
    accentColor: "#334155",
  };
  if (brandMatch) {
    try {
      const parsedBrand = JSON.parse(brandMatch[1]) as Partial<typeof brand>;
      brand = {
        brandName: parsedBrand.brandName ?? "",
        brandLogoUrl: parsedBrand.brandLogoUrl ?? "",
        primaryColor: parsedBrand.primaryColor ?? "#0f172a",
        accentColor: parsedBrand.accentColor ?? "#334155",
      };
    } catch {
      // Keep defaults
    }
  }
  const content = brandMatch ? withoutTheme.replace(brandMatch[0], "") : withoutTheme;
  const config = await getSiteConfigForRender();
  const base = config.url.replace(/\/$/, "");
  const canonicalUrl = `${base}/page/${encodeURIComponent(page.slug)}`;
  const pageDescription = metaDescriptionFromMarkdown(stripCustomPageDecoratorsForSeo(page.content ?? ""), 160);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: pageDescription || page.title,
    url: canonicalUrl,
  };

  // Light-only site: "bold" is high-contrast borders and shadow, not a dark panel.
  const containerClass =
    pageTheme === "bold"
      ? "bg-card text-foreground border-2 border-foreground shadow-[var(--elevation-2)]"
      : pageTheme === "soft"
        ? "bg-muted/50 border-border"
        : "bg-card border-border";
  const titleClass = "text-foreground";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Card className={`shadow-[var(--elevation-2)] ${containerClass}`} style={{ borderTopColor: brand.primaryColor, borderTopWidth: "3px" }}>
        <CardHeader>
          <CardTitle className={titleClass}>{page.title}</CardTitle>
          {(brand.brandName || brand.brandLogoUrl) && (
            <div className="mt-2 rounded border p-2 text-sm" style={{ borderColor: brand.accentColor, color: brand.primaryColor }}>
              <p className="font-medium">{brand.brandName || "Brand"}</p>
              {brand.brandLogoUrl && <p className="text-xs opacity-80">Logo: {brand.brandLogoUrl}</p>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none">
            <MarkdownBodyServer content={content} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
