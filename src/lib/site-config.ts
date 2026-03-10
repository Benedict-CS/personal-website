import { unstable_noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";
import type { NavItem, SiteConfigForRender, SocialLinksMap } from "@/types/site";

export type { NavItem, SiteConfigForRender } from "@/types/site";

const DEFAULT_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/** Fallback when no DB row: generic white-label defaults only. */
const fallback: SiteConfigForRender = {
  siteName: "My Site",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "My Site",
  metaDescription: null,
  authorName: null,
  links: {},
  socialLinks: {},
  navItems: DEFAULT_NAV,
  footerText: null,
  copyrightText: null,
  ogImageUrl: null,
  googleAnalyticsId: null,
  setupCompleted: false,
  templateId: "default",
  themeMode: "light",
  url: siteUrl,
};

const SITE_CONFIG_SELECT = {
  siteName: true,
  logoUrl: true,
  faviconUrl: true,
  metaTitle: true,
  metaDescription: true,
  authorName: true,
  links: true,
  socialLinks: true,
  navItems: true,
  footerText: true,
  copyrightText: true,
  ogImageUrl: true,
  googleAnalyticsId: true,
} as const;

async function mergeCustomPagesIntoNav(navItems: NavItem[]): Promise<NavItem[]> {
  try {
    const customPages = await prisma.customPage.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { slug: true, title: true },
    });
    const existingHrefs = new Set(navItems.map((n) => n.href));
    let result = navItems;
    for (const p of customPages) {
      const href = `/page/${p.slug}`;
      if (!existingHrefs.has(href)) {
        result = [...result, { label: p.title, href }];
        existingHrefs.add(href);
      }
    }
    return result;
  } catch {
    return navItems;
  }
}

export async function getSiteConfigForRender(): Promise<SiteConfigForRender> {
  unstable_noStore(); // Ensure layout is never cached so navbar always has latest custom pages
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { ...SITE_CONFIG_SELECT, setupCompleted: true, templateId: true, themeMode: true, autoAddCustomPagesToNav: true },
    });
    if (!row) {
      const navItems = await mergeCustomPagesIntoNav(DEFAULT_NAV);
      return { ...fallback, navItems };
    }
    const links = (row.links as Record<string, string>) ?? {};
    const socialLinks = (row.socialLinks as SocialLinksMap) ?? {};
    let navItems = Array.isArray(row.navItems) && (row.navItems as NavItem[]).length > 0
      ? (row.navItems as NavItem[])
      : DEFAULT_NAV;
    const setupCompleted = row.setupCompleted ?? false;
    const templateId = row.templateId ?? "default";
    const themeMode = "light" as const;
    const autoAddCustomPagesToNav = row.autoAddCustomPagesToNav ?? true;
    if (autoAddCustomPagesToNav) {
      navItems = await mergeCustomPagesIntoNav(navItems);
    }
    return {
      siteName: row.siteName,
      logoUrl: row.logoUrl,
      faviconUrl: row.faviconUrl,
      metaTitle: row.metaTitle || fallback.metaTitle,
      metaDescription: row.metaDescription,
      authorName: row.authorName,
      links: { ...links },
      socialLinks: { ...socialLinks },
      navItems,
      footerText: row.footerText ?? null,
      copyrightText: row.copyrightText ?? null,
      ogImageUrl: row.ogImageUrl ?? null,
      googleAnalyticsId: row.googleAnalyticsId ?? null,
      setupCompleted,
      templateId,
      themeMode,
      url: siteUrl,
    };
  } catch {
    return fallback;
  }
}
