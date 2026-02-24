import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check for Docker, load balancers, and uptime monitors.
 * GET /api/health → 200 { ok: true, db: "ok" } or 503 if DB unreachable.
 */
export async function GET() {
  const { body, status } = await runHealthCheck();
  return NextResponse.json(body, { status });
}
