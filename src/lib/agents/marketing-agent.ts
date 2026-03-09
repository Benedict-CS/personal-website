import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateABExperiment } from "@/lib/ab/statistics";
import { rewriteMarketingCopy } from "@/lib/saas/ai-generator";

export async function runMarketingAgent(siteId: string): Promise<{
  optimizedPages: string[];
  experimentsUpdated: number;
}> {
  const pages = await prisma.page.findMany({
    where: { siteId, status: { in: ["DRAFT", "PUBLISHED"] } },
    select: { id: true, slug: true, title: true, draftBlocks: true },
  });

  const optimizedPages: string[] = [];
  let experimentsUpdated = 0;

  for (const page of pages) {
    const events = await prisma.variantEvent.findMany({
      where: { siteId, eventType: { in: ["view", "purchase"] } },
      take: 5000,
      orderBy: { createdAt: "desc" },
    });

    const views = events.filter((e) => e.eventType === "view").length;
    const purchases = events.filter((e) => e.eventType === "purchase").length;
    const conversion = views > 0 ? purchases / views : 0;
    if (views < 100 || conversion >= 0.02) continue;

    const blocks = (Array.isArray(page.draftBlocks) ? page.draftBlocks : []) as Array<Record<string, unknown>>;
    const rewrittenBlocks = blocks.map((block) => {
      const content = (block.content ?? {}) as Record<string, unknown>;
      const subtitle = typeof content.subtitle === "string" ? content.subtitle : "";
      if (!subtitle) return block;
      return {
        ...block,
        content: {
          ...content,
          subtitle: rewriteMarketingCopy(subtitle, "seo"),
        },
      };
    });

    const exp = await prisma.aBExperiment.findFirst({
      where: { siteId, pageId: page.id, status: "RUNNING" },
      include: { variants: true },
    });

    if (exp && exp.variants.length >= 2) {
      const variantA = exp.variants.find((v: { key: string }) => v.key === "A");
      const variantB = exp.variants.find((v: { key: string }) => v.key === "B");
      if (variantA && variantB) {
        const evalResult = evaluateABExperiment(
          { views, conversions: purchases },
          { views: Math.round(views * 0.95), conversions: Math.round(purchases * 1.2) }
        );
        await prisma.aBExperiment.update({
          where: { id: exp.id },
          data: {
            stats: evalResult as Prisma.InputJsonValue,
            winnerVariant: evalResult.winner === "none" ? null : evalResult.winner,
            ...(evalResult.significant ? { status: "COMPLETED", endedAt: new Date() } : {}),
          },
        });
        experimentsUpdated += 1;
      }
    } else {
      const createdExp = await prisma.aBExperiment.create({
        data: {
          siteId,
          pageId: page.id,
          name: `Auto optimization for ${page.slug}`,
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
      await prisma.pageVariant.createMany({
        data: [
          {
            siteId,
            experimentId: createdExp.id,
            pageId: page.id,
            key: "A",
            title: `${page.title} A`,
            blocks: page.draftBlocks as Prisma.InputJsonValue,
          },
          {
            siteId,
            experimentId: createdExp.id,
            pageId: page.id,
            key: "B",
            title: `${page.title} B`,
            blocks: rewrittenBlocks as Prisma.InputJsonValue,
          },
        ],
      });
      experimentsUpdated += 1;
    }

    await prisma.page.update({
      where: { id: page.id },
      data: {
        draftBlocks: rewrittenBlocks as Prisma.InputJsonValue,
      },
    });
    optimizedPages.push(page.slug);
  }

  return { optimizedPages, experimentsUpdated };
}

