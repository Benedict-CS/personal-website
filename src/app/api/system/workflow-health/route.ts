import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WINDOW_DAYS = 7;

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  try {
    const [submissionsLast7d, deliveredLast7d, failedLast7d, recentFailures, siteConfig] = await Promise.all([
      prisma.formSubmission.count({
        where: {
          formName: "contact",
          createdAt: { gte: windowStart, lte: now },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "workflow.webhook.delivered",
          createdAt: { gte: windowStart, lte: now },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "workflow.webhook.failed",
          createdAt: { gte: windowStart, lte: now },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "workflow.webhook.failed",
          createdAt: { gte: windowStart, lte: now },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          details: true,
        },
      }),
      prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: { contactWebhookUrl: true },
      }),
    ]);

    const failureRate = submissionsLast7d > 0 ? Math.round((failedLast7d / submissionsLast7d) * 1000) / 10 : 0;
    return NextResponse.json({
      ok: true,
      windowDays: WINDOW_DAYS,
      submissionsLast7d,
      deliveredLast7d,
      failedLast7d,
      failureRate,
      webhookConfigured: Boolean(siteConfig?.contactWebhookUrl?.trim()),
      recentFailures: recentFailures.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        details: entry.details,
      })),
    });
  } catch (error) {
    console.error("[workflow-health] failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load workflow health." }, { status: 500 });
  }
}
