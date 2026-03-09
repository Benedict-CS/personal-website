import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";
import { evaluateABExperiment } from "@/lib/ab/statistics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const experiments = await prisma.aBExperiment.findMany({
    where: { siteId },
    include: { variants: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(experiments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = (await request.json()) as {
    pageId?: string;
    name?: string;
    blocksA?: unknown[];
    blocksB?: unknown[];
  };
  if (!body.pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });

  const exp = await prisma.aBExperiment.create({
    data: {
      siteId,
      pageId: body.pageId,
      name: body.name?.trim() || "A/B Experiment",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  await prisma.pageVariant.createMany({
    data: [
      { siteId, pageId: body.pageId, experimentId: exp.id, key: "A", title: "Variant A", blocks: (body.blocksA ?? []) as Prisma.InputJsonValue },
      { siteId, pageId: body.pageId, experimentId: exp.id, key: "B", title: "Variant B", blocks: (body.blocksB ?? []) as Prisma.InputJsonValue },
    ],
  });
  return NextResponse.json(exp, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = (await request.json()) as { experimentId?: string; complete?: boolean };
  if (!body.experimentId) return NextResponse.json({ error: "experimentId is required" }, { status: 400 });

  const experiment = await prisma.aBExperiment.findFirst({
    where: { id: body.experimentId, siteId },
    include: { variants: true },
  });
  if (!experiment) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  const [eventsA, eventsB] = await Promise.all(
    ["A", "B"].map((key) => {
      const variant = experiment.variants.find((v) => v.key === key);
      if (!variant) return Promise.resolve({ views: 0, conversions: 0 });
      return prisma.variantEvent.findMany({
        where: { siteId, variantId: variant.id, eventType: { in: ["view", "purchase"] } },
      }).then((events) => ({
        views: events.filter((e) => e.eventType === "view").length,
        conversions: events.filter((e) => e.eventType === "purchase").length,
      }));
    })
  );

  const evalResult = evaluateABExperiment(eventsA, eventsB);
  const updated = await prisma.aBExperiment.update({
    where: { id: experiment.id },
    data: {
      stats: evalResult as Prisma.InputJsonValue,
      winnerVariant: evalResult.winner === "none" ? null : evalResult.winner,
      ...(body.complete ? { status: "COMPLETED", endedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}

