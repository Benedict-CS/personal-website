import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const baseUrl = siteConfig.url;

/** Split sitemap: 0 = static + custom pages, 1 = blog posts */
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) {
    // Static + custom pages
    const staticPages: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
      { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
      { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
      { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    ];
    const customPages = await prisma.customPage.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    const customPagesSitemap: MetadataRoute.Sitemap = customPages.map((page) => ({
      url: `${baseUrl}/page/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
    return [...staticPages, ...customPagesSitemap];
  }

  // id === 1: blog posts
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: { OR: [{ published: true }, { publishedAt: { lte: now } }] },
    select: { slug: true, updatedAt: true },
  });
  return posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}
