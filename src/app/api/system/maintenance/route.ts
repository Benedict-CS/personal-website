import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function databaseEngineFromUrl(url: string | undefined): "sqlite" | "postgres" | "unknown" {
  if (!url) return "unknown";
  const normalized = url.toLowerCase();
  if (normalized.startsWith("file:") || normalized.includes("sqlite")) return "sqlite";
  if (normalized.startsWith("postgres://") || normalized.startsWith("postgresql://")) return "postgres";
  return "unknown";
}

async function runHealthCheck() {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
    databaseEngine: databaseEngineFromUrl(process.env.DATABASE_URL),
  };
}

async function runDatabaseMaintenance() {
  const engine = databaseEngineFromUrl(process.env.DATABASE_URL);
  if (engine === "sqlite") {
    await prisma.$executeRawUnsafe("VACUUM;");
    return { engine, operation: "VACUUM" };
  }
  if (engine === "postgres") {
    await prisma.$executeRawUnsafe("ANALYZE;");
    return { engine, operation: "ANALYZE" };
  }
  return { engine, operation: "NOOP" };
}

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const health = await runHealthCheck();
    return NextResponse.json(health, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[system/maintenance:get]", error);
    return NextResponse.json(
      { ok: false, error: "Database health check failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * POST /api/system/maintenance
 * body: { action: "optimize-db" }
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  if (action !== "optimize-db") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const startedAt = Date.now();
    const result = await runDatabaseMaintenance();
    return NextResponse.json({
      ok: true,
      ...result,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[system/maintenance:post]", error);
    return NextResponse.json(
      { ok: false, error: "Database maintenance failed" },
      { status: 500 }
    );
  }
}
