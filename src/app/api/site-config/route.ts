import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem, SiteConfigResponse } from "@/types/site";

const DEFAULT_LINKS = { email: "", github: "", linkedin: "" };

export type { NavItem, SiteConfigResponse } from "@/types/site";

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const CACHE_60 = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };

const defaultResponse: SiteConfigResponse = {
  siteName: "My Site",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "",
  metaDescription: null,
  authorName: null,
  links: DEFAULT_LINKS,
  navItems: DEFAULT_NAV_ITEMS,
  footerText: null,
  ogImageUrl: null,
  setupCompleted: false,
  templateId: "default",
  themeMode: "light",
  autoAddCustomPagesToNav: true,
};

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

export async function GET() {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: SITE_CONFIG_SAFE_SELECT,
    });
    if (!row) return NextResponse.json(defaultResponse);
    const links = (row.links as Record<string, string>) ?? {};
    const navItems = Array.isArray(row.navItems) && (row.navItems as NavItem[]).length > 0
      ? (row.navItems as NavItem[])
      : DEFAULT_NAV_ITEMS;
    let setupCompleted = false;
    let templateId = "default";
    const themeMode = "light" as const;
    let autoAddCustomPagesToNav = true;
    try {
      const extra = await prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: { setupCompleted: true, templateId: true, themeMode: true, autoAddCustomPagesToNav: true },
      });
      if (extra) {
        setupCompleted = extra.setupCompleted ?? false;
        templateId = extra.templateId ?? "default";
        autoAddCustomPagesToNav = extra.autoAddCustomPagesToNav ?? true;
      }
    } catch {
      // New columns not yet migrated
    }
    return NextResponse.json(
      {
        siteName: row.siteName,
        logoUrl: row.logoUrl,
        faviconUrl: row.faviconUrl,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        authorName: row.authorName,
        links: { ...DEFAULT_LINKS, ...links },
        navItems,
        footerText: row.footerText ?? null,
        ogImageUrl: row.ogImageUrl ?? null,
        setupCompleted,
        templateId,
        themeMode,
        autoAddCustomPagesToNav,
      } satisfies SiteConfigResponse,
      { headers: CACHE_60 }
    );
  } catch {
    return NextResponse.json(defaultResponse, { headers: CACHE_60 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const body = await request.json();
  const {
    siteName,
    logoUrl,
    faviconUrl,
    metaTitle,
    metaDescription,
    authorName,
    links,
    navItems,
    footerText,
    ogImageUrl,
    setupCompleted,
    templateId,
    autoAddCustomPagesToNav,
  } = body;
  const safeNavItems = Array.isArray(navItems)
    ? (navItems as unknown[]).filter((n): n is { label: string; href: string } =>
        n != null && typeof n === "object" && "label" in n && "href" in n
      )
    : DEFAULT_NAV_ITEMS;
  const now = new Date();
  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        siteName: typeof siteName === "string" ? siteName : "My Site",
        logoUrl: logoUrl ?? null,
        faviconUrl: faviconUrl ?? null,
        metaTitle: typeof metaTitle === "string" ? metaTitle : "",
        metaDescription: metaDescription ?? null,
        authorName: authorName ?? null,
        links: links && typeof links === "object" ? links : {},
        navItems: safeNavItems,
        footerText: footerText ?? null,
        ogImageUrl: ogImageUrl ?? null,
        setupCompleted: setupCompleted === true,
        templateId: typeof templateId === "string" && ["default", "minimal", "card"].includes(templateId) ? templateId : "default",
        themeMode: "light",
        autoAddCustomPagesToNav: autoAddCustomPagesToNav !== false,
        updatedAt: now,
      },
      update: {
        ...(typeof siteName === "string" && { siteName }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(faviconUrl !== undefined && { faviconUrl: faviconUrl || null }),
        ...(typeof metaTitle === "string" && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription: metaDescription || null }),
        ...(authorName !== undefined && { authorName: authorName || null }),
        ...(links && typeof links === "object" && { links }),
        navItems: safeNavItems,
        ...(footerText !== undefined && { footerText: footerText || null }),
        ...(ogImageUrl !== undefined && { ogImageUrl: ogImageUrl || null }),
        ...(setupCompleted !== undefined && { setupCompleted: setupCompleted === true }),
        ...(typeof templateId === "string" && ["default", "minimal", "card"].includes(templateId) && { templateId }),
        themeMode: "light",
        ...(typeof autoAddCustomPagesToNav === "boolean" && { autoAddCustomPagesToNav }),
        updatedAt: now,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error updating site config:", e);
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
