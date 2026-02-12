import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

export type NavItem = { label: string; href: string };

const DEFAULT_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export type SiteConfigForRender = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string;
  metaDescription: string | null;
  authorName: string | null;
  links: { email?: string; github?: string; linkedin?: string };
  navItems: NavItem[];
  footerText: string | null;
  ogImageUrl: string | null;
  url: string;
};

const fallback: SiteConfigForRender = {
  siteName: siteConfig.name,
  logoUrl: null,
  faviconUrl: null,
  metaTitle: siteConfig.title,
  metaDescription: siteConfig.description ?? null,
  authorName: siteConfig.author.name,
  links: siteConfig.links,
  navItems: DEFAULT_NAV,
  footerText: null,
  ogImageUrl: siteConfig.ogImage ?? null,
  url: siteConfig.url,
};

export async function getSiteConfigForRender(): Promise<SiteConfigForRender> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return fallback;
    const links = (row.links as Record<string, string>) ?? {};
    const navItems = Array.isArray(row.navItems) && (row.navItems as NavItem[]).length > 0
      ? (row.navItems as NavItem[])
      : DEFAULT_NAV;
    return {
      siteName: row.siteName,
      logoUrl: row.logoUrl,
      faviconUrl: row.faviconUrl,
      metaTitle: row.metaTitle || fallback.metaTitle,
      metaDescription: row.metaDescription,
      authorName: row.authorName,
      links: { ...fallback.links, ...links },
      navItems,
      footerText: row.footerText ?? null,
      ogImageUrl: row.ogImageUrl ?? null,
      url: siteConfig.url,
    };
  } catch {
    return fallback;
  }
}
