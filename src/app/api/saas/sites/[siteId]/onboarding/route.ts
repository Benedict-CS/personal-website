import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";
import { CORE_SITE_TEMPLATES } from "@/lib/saas/templates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canManageSite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as { templateKey?: string };
  const template = CORE_SITE_TEMPLATES.find((t) => t.key === body.templateKey) ?? CORE_SITE_TEMPLATES[0];

  const result = await prisma.$transaction(async (tx) => {
    await tx.block.deleteMany({ where: { siteId } });
    await tx.pageVersion.deleteMany({ where: { siteId } });
    await tx.page.deleteMany({ where: { siteId } });

    await tx.siteTemplate.upsert({
      where: { siteId_key: { siteId, key: template.key } },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        pages: template.pages as Prisma.InputJsonValue,
      },
      create: {
        siteId,
        key: template.key,
        name: template.name,
        description: template.description,
        category: template.category,
        pages: template.pages as Prisma.InputJsonValue,
      },
    });

    for (const page of template.pages) {
      const createdPage = await tx.page.create({
        data: {
          siteId,
          slug: page.slug,
          title: page.title,
          status: "DRAFT",
          draftBlocks: page.blocks as Prisma.InputJsonValue,
          publishedTree: [] as Prisma.InputJsonValue,
        },
      });
      await tx.pageVersion.create({
        data: {
          siteId,
          pageId: createdPage.id,
          versionNumber: 1,
          status: "DRAFT",
          snapshot: { blocks: page.blocks } as Prisma.InputJsonValue,
          createdById: tenant.context.userId,
        },
      });
    }
    return { ok: true };
  });

  return NextResponse.json(result);
}

