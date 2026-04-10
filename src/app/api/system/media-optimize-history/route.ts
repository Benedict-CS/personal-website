import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OptimizeHistoryRow = {
  id: string;
  createdAt: string;
  optimizedCount: number;
  failedCount: number;
  attempted: number;
  savedBytesTotal: number;
  minBytes: number | null;
  maxItems: number | null;
};

function parseDetails(details: string | null): {
  optimizedCount: number;
  failedCount: number;
  attempted: number;
  savedBytesTotal: number;
  minBytes: number | null;
  maxItems: number | null;
} {
  if (!details) {
    return {
      optimizedCount: 0,
      failedCount: 0,
      attempted: 0,
      savedBytesTotal: 0,
      minBytes: null,
      maxItems: null,
    };
  }
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    const toNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
    const toNullableNumber = (value: unknown): number | null =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    return {
      optimizedCount: toNumber(parsed.optimizedCount),
      failedCount: toNumber(parsed.failedCount),
      attempted: toNumber(parsed.attempted),
      savedBytesTotal: toNumber(parsed.savedBytesTotal),
      minBytes: toNullableNumber(parsed.minBytes),
      maxItems: toNullableNumber(parsed.maxItems),
    };
  } catch {
    return {
      optimizedCount: 0,
      failedCount: 0,
      attempted: 0,
      savedBytesTotal: 0,
      minBytes: null,
      maxItems: null,
    };
  }
}

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        action: "media.optimize",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        details: true,
      },
    });

    const history: OptimizeHistoryRow[] = rows.map((row) => {
      const parsed = parseDetails(row.details);
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        optimizedCount: parsed.optimizedCount,
        failedCount: parsed.failedCount,
        attempted: parsed.attempted,
        savedBytesTotal: parsed.savedBytesTotal,
        minBytes: parsed.minBytes,
        maxItems: parsed.maxItems,
      };
    });

    return NextResponse.json({
      ok: true,
      history,
    });
  } catch (error) {
    console.error("[media-optimize-history] failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load media optimize history." }, { status: 500 });
  }
}
