import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Client sends when leaving a page; we update the most recent PageView for this IP+path with duration. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!siteOrigin || (!origin.startsWith(siteOrigin) && origin !== "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { path?: string; durationSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path : "/";
  const duration = typeof body.durationSeconds === "number" ? Math.round(body.durationSeconds) : null;
  if (duration === null || duration < 0) {
    return NextResponse.json({ ok: true });
  }
  const ip = getClientIP(request);
  const since = new Date(Date.now() - 30 * 60 * 1000);
  try {
    const row = await prisma.pageView.findFirst({
      where: { ip, path, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (row) {
      await prisma.pageView.update({
        where: { id: row.id },
        data: { durationSeconds: duration },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Analytics leave error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
