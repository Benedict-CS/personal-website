import { prisma } from "@/lib/prisma";

export type HealthResult = {
  ok: boolean;
  db: "ok" | "error";
  /** API variant when using `/api/v1/health` (e.g. `"v1"`). */
  version?: string;
  /** Deployment or release label from `APP_VERSION` / `GIT_COMMIT` (operators, migrations). */
  appVersion?: string;
  /** Process uptime in seconds (Node.js); useful for orchestrators and uptime correlation. */
  uptimeSeconds?: number;
  /** Node.js runtime (e.g. `v20.10.0`); confirms container vs host runtime. */
  node?: string;
};

function deploymentLabel(): string | undefined {
  const v = process.env.APP_VERSION?.trim();
  if (v) return v;
  const g = process.env.GIT_COMMIT?.trim();
  if (g) return g.length > 12 ? g.slice(0, 12) : g;
  return undefined;
}

/**
 * Shared health check logic. Used by /api/health and /api/v1/health.
 */
export async function runHealthCheck(version?: string): Promise<{ body: HealthResult; status: number }> {
  const uptimeSeconds = Math.round(process.uptime());
  const appVersion = deploymentLabel();
  const node = process.version;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthResult = { ok: true, db: "ok", uptimeSeconds, node };
    if (version) body.version = version;
    if (appVersion) body.appVersion = appVersion;
    return { body, status: 200 };
  } catch (e) {
    console.error("Health check failed:", e);
    const body: HealthResult = { ok: false, db: "error", uptimeSeconds, node };
    if (version) body.version = version;
    if (appVersion) body.appVersion = appVersion;
    return { body, status: 503 };
  }
}
