import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const body = (await request.json()) as {
    variantId?: string | null;
    orderId?: string | null;
    eventType?: string;
    valueCents?: number;
    metadata?: Record<string, unknown>;
  };
  if (!body.eventType) return NextResponse.json({ error: "eventType is required" }, { status: 400 });

  const event = await prisma.variantEvent.create({
    data: {
      siteId,
      variantId: body.variantId || null,
      orderId: body.orderId || null,
      eventType: body.eventType,
      valueCents: body.valueCents ?? null,
      metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(event, { status: 201 });
}

