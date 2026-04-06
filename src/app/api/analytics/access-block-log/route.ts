import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEADER = "x-access-block-log-secret";

function getSecret(): string {
  return (
    process.env.ACCESS_BLOCK_LOG_SECRET ||
    process.env.ANALYTICS_SECRET ||
    ""
  ).trim();
}

/** Dedup: one row per ip per 60s to avoid bursts */
async function isRecentDuplicate(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 1000);
  const existing = await prisma.accessBlockLog.findFirst({
    where: { ip, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

/**
 * POST from proxy only. Header X-Access-Block-Log-Secret must match
 * ACCESS_BLOCK_LOG_SECRET or ANALYTICS_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ ok: false, skipped: "no_secret" }, { status: 503 });
  }
  const sent = request.headers.get(HEADER);
  if (sent !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ip?: string; path?: string; userAgent?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ip = typeof body.ip === "string" && body.ip.trim() ? body.ip.trim() : "unknown";
  const path = typeof body.path === "string" ? body.path.slice(0, 2048) : "/";
  const userAgent =
    typeof body.userAgent === "string" ? body.userAgent.trim().slice(0, 512) : null;

  if (await isRecentDuplicate(ip)) {
    return NextResponse.json({ ok: true, skipped: "dedup" });
  }

  try {
    await prisma.accessBlockLog.create({
      data: { ip, path, userAgent },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("access-block-log create error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
