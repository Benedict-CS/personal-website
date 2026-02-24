import { prisma } from "@/lib/prisma";

export type HealthResult = { ok: boolean; db: "ok" | "error"; version?: string };

/**
 * Shared health check logic. Used by /api/health and /api/v1/health.
 */
export async function runHealthCheck(version?: string): Promise<{ body: HealthResult; status: number }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthResult = { ok: true, db: "ok" };
    if (version) body.version = version;
    return { body, status: 200 };
  } catch (e) {
    console.error("Health check failed:", e);
    const body: HealthResult = { ok: false, db: "error" };
    if (version) body.version = version;
    return { body, status: 503 };
  }
}
