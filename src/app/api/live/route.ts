import { emptyHealthProbe, jsonHealthProbe } from "@/lib/health-http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight liveness probe: does not touch the database.
 * Use for process/up checks; use GET /api/health for readiness (DB connectivity).
 */
export function GET() {
  return jsonHealthProbe({ ok: true, live: true }, 200);
}

export function HEAD() {
  return emptyHealthProbe(200);
}
