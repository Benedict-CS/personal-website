import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_LINKS = { email: "", github: "", linkedin: "" };

export type NavItem = { label: string; href: string };

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export type SiteConfigResponse = {
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
};

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
};

export async function GET() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return NextResponse.json(defaultResponse);
    const links = (row.links as Record<string, string>) ?? {};
    const navItems = Array.isArray(row.navItems) && (row.navItems as NavItem[]).length > 0
      ? (row.navItems as NavItem[])
      : DEFAULT_NAV_ITEMS;
    return NextResponse.json({
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
    } satisfies SiteConfigResponse);
  } catch {
    return NextResponse.json(defaultResponse);
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
