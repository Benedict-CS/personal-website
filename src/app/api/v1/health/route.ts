import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API v1 health check. Same as /api/health for versioned clients.
 */
export async function GET() {
  const { body, status } = await runHealthCheck("v1");
  return NextResponse.json(body, { status });
}
