import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";
import { isCustomPagePublicOnSite } from "@/lib/custom-page-schedule";

export const dynamic = "force-dynamic";

const baseUrl = siteUrl;

/** Single `/sitemap.xml` urlset: static routes, public custom pages, and public posts. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  let customPagesSitemap: MetadataRoute.Sitemap = [];
  try {
    const customPages = await prisma.customPage.findMany({
      select: { slug: true, updatedAt: true, published: true, content: true },
    });
    customPagesSitemap = customPages
      .filter((page) => isCustomPagePublicOnSite(page.published, page.content))
      .map((page) => ({
        url: `${baseUrl}/page/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // Unreachable DB (e.g. CI smoke) — still emit core URLs for crawlers.
  }

  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const now = new Date();
    const posts = await prisma.post.findMany({
      where: { OR: [{ published: true }, { publishedAt: { lte: now } }] },
      select: { slug: true, updatedAt: true },
    });
    postEntries = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Same as custom pages: degrade gracefully when the database is down.
  }

  return [...staticPages, ...customPagesSitemap, ...postEntries];
}
