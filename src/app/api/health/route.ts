import { runHealthCheck } from "@/lib/health";
import { emptyHealthProbe, jsonHealthProbe } from "@/lib/health-http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check for Docker, load balancers, and uptime monitors.
 * GET /api/health → 200 { ok: true, db: "ok", uptimeSeconds: number } or 503 if DB unreachable.
 * HEAD /api/health → same status code without a body (cheap readiness probes).
 */
export async function GET() {
  const { body, status } = await runHealthCheck();
  return jsonHealthProbe(body, status);
}

export async function HEAD() {
  const { status } = await runHealthCheck();
  return emptyHealthProbe(status);
}
