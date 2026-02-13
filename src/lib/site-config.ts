import { unstable_noStore } from "next/cache";
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
  setupCompleted: boolean;
  templateId: string;
  themeMode: "light" | "dark" | "system";
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
  setupCompleted: false,
  templateId: "default",
  themeMode: "system",
  url: siteConfig.url,
};

// Select only columns that exist before migration 20260214000001 (setupCompleted, templateId).
// This avoids "column does not exist" when production DB has not run the new migration yet.
const SITE_CONFIG_SAFE_SELECT = {
  siteName: true,
  logoUrl: true,
  faviconUrl: true,
  metaTitle: true,
  metaDescription: true,
  authorName: true,
  links: true,
  navItems: true,
  footerText: true,
  ogImageUrl: true,
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
      select: SITE_CONFIG_SAFE_SELECT,
    });
    if (!row) {
      const navItems = await mergeCustomPagesIntoNav(DEFAULT_NAV);
      return { ...fallback, navItems };
    }
    const links = (row.links as Record<string, string>) ?? {};
    let navItems = Array.isArray(row.navItems) && (row.navItems as NavItem[]).length > 0
      ? (row.navItems as NavItem[])
      : DEFAULT_NAV;
    let setupCompleted = false;
    let templateId = "default";
    let themeMode: "light" | "dark" | "system" = "system";
    let autoAddCustomPagesToNav = true;
    try {
      const extra = await prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: { setupCompleted: true, templateId: true, themeMode: true, autoAddCustomPagesToNav: true },
      });
      if (extra) {
        setupCompleted = extra.setupCompleted ?? false;
        templateId = extra.templateId ?? "default";
        themeMode = (extra.themeMode === "light" || extra.themeMode === "dark" || extra.themeMode === "system") ? extra.themeMode : "system";
        autoAddCustomPagesToNav = extra.autoAddCustomPagesToNav ?? true;
      }
    } catch {
      // New columns not yet migrated: assume auto-add is on so custom pages still show
    }
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
      links: { ...fallback.links, ...links },
      navItems,
      footerText: row.footerText ?? null,
      ogImageUrl: row.ogImageUrl ?? null,
      setupCompleted,
      templateId,
      themeMode,
      url: siteConfig.url,
    };
  } catch {
    return fallback;
  }
}
