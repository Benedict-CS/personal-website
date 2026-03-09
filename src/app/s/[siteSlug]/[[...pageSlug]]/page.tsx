import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BlockRenderer } from "@/components/saas/block-renderer";
import { MockCheckoutPanel } from "@/components/saas/mock-checkout-panel";

type BlockPayload = {
  id?: string;
  type?: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
};

export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ siteSlug: string; pageSlug?: string[] }>;
}) {
  const { siteSlug, pageSlug } = await params;
  const site = await prisma.tenantSite.findUnique({
    where: { slug: siteSlug },
    select: { id: true, name: true, themeTokens: true },
  });
  if (!site) return notFound();

  const slug = pageSlug?.[0] || "home";
  const page = await prisma.page.findFirst({
    where: { siteId: site.id, slug, status: "PUBLISHED" },
    select: { id: true, title: true, publishedTree: true, draftBlocks: true, status: true },
  });
  if (!page) return notFound();

  const cookieStore = await cookies();
  const cookieKey = `abv_${siteSlug}_${slug}`;
  const variantCookie = cookieStore.get(cookieKey)?.value;
  const variantKey = variantCookie === "A" || variantCookie === "B" ? variantCookie : "A";

  const runningExperiment = await prisma.aBExperiment.findFirst({
    where: { siteId: site.id, pageId: page.id, status: "RUNNING" },
    include: { variants: { where: { active: true } } },
  });

  let source: Prisma.JsonValue =
    Array.isArray(page.publishedTree) && page.publishedTree.length > 0 ? page.publishedTree : page.draftBlocks;
  let variantId: string | null = null;
  if (runningExperiment) {
    const variant = runningExperiment.variants.find((v) => v.key === variantKey);
    if (variant && Array.isArray(variant.blocks) && variant.blocks.length > 0) {
      source = variant.blocks as Prisma.JsonValue;
      variantId = variant.id;
    }
  }
  const normalizedSource = (Array.isArray(source) ? (source as unknown[]) : []) as BlockPayload[];
  const blocks = normalizedSource.map((b: BlockPayload, idx: number) => ({
    id: String(b.id ?? `public-${idx}`),
    type: String(b.type ?? "LayoutCard"),
    content: b.content ?? {},
    styles: b.styles ?? {},
  }));

  await prisma.variantEvent.create({
    data: {
      siteId: site.id,
      variantId,
      eventType: "view",
      metadata: { siteSlug, pageSlug: slug, variant: variantKey },
    },
  }).catch(() => null);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-900">{site.name}</h1>
        <p className="text-slate-600">{page.title}</p>
      </header>
      <BlockRenderer blocks={blocks} />
      <div className="mt-8">
        <MockCheckoutPanel siteId={site.id} />
      </div>
    </div>
  );
}

