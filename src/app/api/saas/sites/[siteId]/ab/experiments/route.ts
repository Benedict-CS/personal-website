import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";
import { evaluateABExperiment } from "@/lib/ab/statistics";

function clampSplit(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(95, Math.max(5, Math.round(value)));
}

function getMinimumSamplePerVariant(): number {
  const raw = Number(process.env.AB_MIN_SAMPLE_PER_VARIANT ?? "50");
  if (!Number.isFinite(raw)) return 50;
  return Math.max(10, Math.round(raw));
}

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
    trafficSplitA?: number;
    status?: "DRAFT" | "RUNNING";
  };
  if (!body.pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  const trafficSplitA = clampSplit(typeof body.trafficSplitA === "number" ? body.trafficSplitA : 50);
  const status = body.status === "RUNNING" ? "RUNNING" : "DRAFT";

  const exp = await prisma.aBExperiment.create({
    data: {
      siteId,
      pageId: body.pageId,
      name: body.name?.trim() || "A/B Experiment",
      status,
      startedAt: status === "RUNNING" ? new Date() : null,
      trafficSplitA,
      trafficSplitB: 100 - trafficSplitA,
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

  const body = (await request.json()) as {
    experimentId?: string;
    complete?: boolean;
    action?: "evaluate" | "start" | "stop" | "set_winner" | "set_split";
    winnerVariant?: "A" | "B" | null;
    trafficSplitA?: number;
  };
  if (!body.experimentId) return NextResponse.json({ error: "experimentId is required" }, { status: 400 });

  const experiment = await prisma.aBExperiment.findFirst({
    where: { id: body.experimentId, siteId },
    include: { variants: true },
  });
  if (!experiment) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  const action = body.action ?? "evaluate";
  if (action === "set_split") {
    const trafficSplitA = clampSplit(typeof body.trafficSplitA === "number" ? body.trafficSplitA : experiment.trafficSplitA);
    const updated = await prisma.aBExperiment.update({
      where: { id: experiment.id },
      data: {
        trafficSplitA,
        trafficSplitB: 100 - trafficSplitA,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "set_winner") {
    const winnerVariant = body.winnerVariant === "A" || body.winnerVariant === "B" ? body.winnerVariant : null;
    if (winnerVariant) {
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
      const minSample = getMinimumSamplePerVariant();
      if (eventsA.views < minSample || eventsB.views < minSample) {
        return NextResponse.json(
          {
            error: `Sample too small to lock winner. Need at least ${minSample} views per variant.`,
            minSamplePerVariant: minSample,
          },
          { status: 409 }
        );
      }
    }
    const updated = await prisma.aBExperiment.update({
      where: { id: experiment.id },
      data: {
        winnerVariant,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "start") {
    const updated = await prisma.aBExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "RUNNING",
        startedAt: experiment.startedAt ?? new Date(),
        endedAt: null,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "stop") {
    const updated = await prisma.aBExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  }

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
  const minSamplePerVariant = getMinimumSamplePerVariant();
  const hasEnoughSample = eventsA.views >= minSamplePerVariant && eventsB.views >= minSamplePerVariant;
  const guardedResult = {
    ...evalResult,
    viewsA: eventsA.views,
    viewsB: eventsB.views,
    conversionsA: eventsA.conversions,
    conversionsB: eventsB.conversions,
    minSamplePerVariant,
    hasEnoughSample,
    winner: hasEnoughSample ? evalResult.winner : "none",
    significant: hasEnoughSample ? evalResult.significant : false,
  };
  const updated = await prisma.aBExperiment.update({
    where: { id: experiment.id },
    data: {
      stats: guardedResult as Prisma.InputJsonValue,
      winnerVariant: guardedResult.winner === "none" ? null : guardedResult.winner,
      ...(body.complete ? { status: "COMPLETED", endedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}

