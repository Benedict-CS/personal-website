import { runHealthCheck } from "@/lib/health";
import { emptyHealthProbe, jsonHealthProbe } from "@/lib/health-http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API v1 health check. Same as /api/health for versioned clients.
 */
export async function GET() {
  const { body, status } = await runHealthCheck("v1");
  return jsonHealthProbe(body, status);
}

export async function HEAD() {
  const { status } = await runHealthCheck("v1");
  return emptyHealthProbe(status);
}
