import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSaasUser } from "@/lib/tenant-auth";
import { CORE_SITE_TEMPLATES, buildTemplatePagesPayload } from "@/lib/saas/templates";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "site";
}

export async function GET() {
  const ensured = await ensureSaasUser();
  if ("unauthorized" in ensured) return ensured.unauthorized;
  const { user } = ensured;

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    include: { site: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(
    accounts.map((a) => ({
      accountId: a.id,
      role: a.role,
      site: a.site,
    }))
  );
}

export async function POST(request: NextRequest) {
  const ensured = await ensureSaasUser();
  if ("unauthorized" in ensured) return ensured.unauthorized;
  const { user } = ensured;

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    templateKey?: string;
  };

  const name = body.name?.trim() || "My SaaS Site";
  let slug = normalizeSlug(body.slug || name);
  const templateKey = body.templateKey?.trim() || "corporate";

  let suffix = 1;
  while (await prisma.tenantSite.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${normalizeSlug(body.slug || name)}-${suffix++}`;
  }

  const template = CORE_SITE_TEMPLATES.find((t) => t.key === templateKey) ?? CORE_SITE_TEMPLATES[0];
  const pagesJson = buildTemplatePagesPayload(template.key);

  const created = await prisma.$transaction(async (tx) => {
    const site = await tx.tenantSite.create({
      data: {
        slug,
        name,
        status: "DRAFT",
        createdById: user.id,
        themeTokens: {
          palette: { primary: "#2563eb", accent: "#0f172a", surface: "#ffffff", muted: "#f8fafc" },
          typography: { heading: "Inter", body: "Inter" },
          button: { radius: 10, shadow: "0 2px 6px rgba(37, 99, 235, 0.2)" },
        } as Prisma.InputJsonValue,
      },
    });

    await tx.account.create({
      data: {
        userId: user.id,
        siteId: site.id,
        role: "owner",
      },
    });

    await tx.subscription.create({
      data: {
        userId: user.id,
        siteId: site.id,
        plan: "FREE",
        status: "TRIALING",
      },
    });

    await tx.siteTemplate.create({
      data: {
        siteId: site.id,
        key: template.key,
        name: template.name,
        description: template.description,
        category: template.category,
        pages: pagesJson,
      },
    });

    for (const page of template.pages) {
      const createdPage = await tx.page.create({
        data: {
          siteId: site.id,
          slug: page.slug,
          title: page.title,
          status: "DRAFT",
          draftBlocks: page.blocks as Prisma.InputJsonValue,
          publishedTree: [] as Prisma.InputJsonValue,
        },
      });
      await tx.pageVersion.create({
        data: {
          siteId: site.id,
          pageId: createdPage.id,
          versionNumber: 1,
          status: "DRAFT",
          snapshot: { blocks: page.blocks } as Prisma.InputJsonValue,
          createdById: user.id,
        },
      });
    }

    return site;
  });

  return NextResponse.json(created, { status: 201 });
}

