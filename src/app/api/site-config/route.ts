import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { revalidateSiteConfigRenderCache } from "@/lib/site-config";
import type { NavItem, SiteConfigResponse } from "@/types/site";
import { DEFAULT_NAV_ITEMS, DEFAULT_SITE_CONFIG_LINKS } from "@/lib/site-config-defaults";

export type { NavItem, SiteConfigResponse } from "@/types/site";

const CACHE_60 = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };

const defaultResponse: SiteConfigResponse = {
  siteName: "My Site",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "",
  metaDescription: null,
  metaKeywords: null,
  authorName: null,
  links: { ...DEFAULT_SITE_CONFIG_LINKS },
  socialLinks: {},
  navItems: DEFAULT_NAV_ITEMS,
  footerText: null,
  copyrightText: null,
  ogImageUrl: null,
  googleAnalyticsId: null,
  setupCompleted: false,
  templateId: "default",
  themeMode: "light",
  autoAddCustomPagesToNav: true,
  contactEmail: null,
};

const SITE_CONFIG_SAFE_SELECT = {
  siteName: true,
  logoUrl: true,
  faviconUrl: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  authorName: true,
  links: true,
  socialLinks: true,
  navItems: true,
  footerText: true,
  copyrightText: true,
  ogImageUrl: true,
  googleAnalyticsId: true,
  contactEmail: true,
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
    let contactEmail: string | null = null;
    try {
      const extra = await prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: { setupCompleted: true, templateId: true, themeMode: true, autoAddCustomPagesToNav: true, contactEmail: true },
      });
      if (extra) {
        setupCompleted = extra.setupCompleted ?? false;
        templateId = extra.templateId ?? "default";
        autoAddCustomPagesToNav = extra.autoAddCustomPagesToNav ?? true;
        contactEmail = extra.contactEmail ?? null;
      }
    } catch {
      // New columns not yet migrated
    }
    const resolvedContactEmail = contactEmail ?? (row as { contactEmail?: string | null }).contactEmail ?? null;
    const socialLinks = (row.socialLinks as Record<string, string>) ?? {};
    return NextResponse.json(
      {
        siteName: row.siteName,
        logoUrl: row.logoUrl,
        faviconUrl: row.faviconUrl,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords ?? null,
        authorName: row.authorName,
        links: { ...DEFAULT_SITE_CONFIG_LINKS, ...links },
        socialLinks: { ...socialLinks },
        navItems,
        footerText: row.footerText ?? null,
        copyrightText: (row as { copyrightText?: string | null }).copyrightText ?? null,
        ogImageUrl: row.ogImageUrl ?? null,
        googleAnalyticsId: (row as { googleAnalyticsId?: string | null }).googleAnalyticsId ?? null,
        setupCompleted,
        templateId,
        themeMode,
        autoAddCustomPagesToNav,
        contactEmail: resolvedContactEmail,
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
    metaKeywords,
    authorName,
    links,
    socialLinks,
    navItems,
    footerText,
    copyrightText,
    ogImageUrl,
    googleAnalyticsId,
    setupCompleted,
    templateId,
    autoAddCustomPagesToNav,
    contactEmail: contactEmailBody,
  } = body;
  const safeNavItems = Array.isArray(navItems)
    ? (navItems as unknown[]).filter((n): n is { label: string; href: string } =>
        n != null && typeof n === "object" && "label" in n && "href" in n
      )
    : undefined;
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
        metaKeywords: typeof metaKeywords === "string" ? metaKeywords.trim() || null : null,
        authorName: authorName ?? null,
        links: links && typeof links === "object" ? links : {},
        socialLinks: socialLinks && typeof socialLinks === "object" ? socialLinks : {},
        navItems: safeNavItems && safeNavItems.length > 0 ? safeNavItems : DEFAULT_NAV_ITEMS,
        footerText: footerText ?? null,
        copyrightText: copyrightText ?? null,
        ogImageUrl: ogImageUrl ?? null,
        googleAnalyticsId: typeof googleAnalyticsId === "string" ? googleAnalyticsId : null,
        setupCompleted: setupCompleted === true,
        templateId: typeof templateId === "string" && ["default", "minimal", "card"].includes(templateId) ? templateId : "default",
        themeMode: "light",
        autoAddCustomPagesToNav: autoAddCustomPagesToNav !== false,
        contactEmail: contactEmailBody ?? null,
        updatedAt: now,
      },
      update: {
        ...(typeof siteName === "string" && { siteName }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(faviconUrl !== undefined && { faviconUrl: faviconUrl || null }),
        ...(typeof metaTitle === "string" && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription: metaDescription || null }),
        ...(metaKeywords !== undefined && {
          metaKeywords: typeof metaKeywords === "string" ? metaKeywords.trim() || null : null,
        }),
        ...(authorName !== undefined && { authorName: authorName || null }),
        ...(links && typeof links === "object" && { links }),
        ...(socialLinks && typeof socialLinks === "object" && { socialLinks }),
        ...(safeNavItems && safeNavItems.length > 0 && { navItems: safeNavItems }),
        ...(footerText !== undefined && { footerText: footerText || null }),
        ...(copyrightText !== undefined && { copyrightText: copyrightText || null }),
        ...(ogImageUrl !== undefined && { ogImageUrl: ogImageUrl || null }),
        ...(typeof googleAnalyticsId === "string" && { googleAnalyticsId }),
        ...(setupCompleted !== undefined && { setupCompleted: setupCompleted === true }),
        ...(typeof templateId === "string" && ["default", "minimal", "card"].includes(templateId) && { templateId }),
        themeMode: "light",
        ...(typeof autoAddCustomPagesToNav === "boolean" && { autoAddCustomPagesToNav }),
        ...(contactEmailBody !== undefined && { contactEmail: contactEmailBody === "" ? null : contactEmailBody }),
        updatedAt: now,
      },
    });
    await auditLog({
      action: "site_config.update",
      resourceType: "site_config",
      resourceId: "1",
      details: JSON.stringify({
        updatedKeys: Object.keys(body ?? {}),
      }),
      ip: request.headers.get("x-forwarded-for") ?? null,
    });
    revalidateSiteConfigRenderCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error updating site config:", e);
    const message = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
