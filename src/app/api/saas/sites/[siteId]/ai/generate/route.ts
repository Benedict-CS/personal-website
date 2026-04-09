import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";
import {
  asJsonValue,
  generateSiteSchemaFromPrompt,
  tryFetchUnsplashImage,
} from "@/lib/saas/ai-generator";

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

  let body: { prompt?: string };
  try {
    body = (await request.json()) as { prompt?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  try {
  const generated = generateSiteSchemaFromPrompt(prompt);
  const heroImage = await tryFetchUnsplashImage(prompt);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.pageVersion.deleteMany({ where: { siteId } });
    await tx.page.deleteMany({ where: { siteId } });

    await tx.tenantSite.update({
      where: { id: siteId },
      data: {
        name: generated.siteName,
        themeTokens: asJsonValue({
          palette: generated.palette,
          typography: generated.typography,
          button: { radius: 10, shadow: "0 2px 6px rgba(15, 23, 42, 0.16)" },
        }),
      },
    });

    for (const page of generated.pages) {
      const blocks = page.blocks.map((b, idx) => ({
        id: `ai-${idx}`,
        ...b,
        content: {
          ...b.content,
          ...(idx === 0 && heroImage ? { heroImage } : {}),
        },
      }));

      const created = await tx.page.create({
        data: {
          siteId,
          slug: page.slug,
          title: page.title,
          status: "DRAFT",
          draftBlocks: asJsonValue(blocks),
          publishedTree: asJsonValue([]),
        },
      });

      await tx.pageVersion.create({
        data: {
          siteId,
          pageId: created.id,
          versionNumber: 1,
          status: "DRAFT",
          snapshot: asJsonValue({
            source: "ai_copilot",
            prompt,
            blocks,
          }),
          createdById: tenant.context.userId,
        },
      });
    }

    return { ok: true };
  });

  return NextResponse.json({ ...txResult, generated });
  } catch (e) {
    console.error("SaaS AI generate:", e);
    return NextResponse.json(
      {
        error:
          "Site generation could not be completed. The AI step or database write failed. Try again in a moment.",
      },
      { status: 500 }
    );
  }
}

