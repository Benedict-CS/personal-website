import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getFromS3, listS3Objects, uploadToS3 } from "@/lib/s3";
import { processImage } from "@/lib/image-process";
import { auditLog } from "@/lib/audit";

const COMPRESSIBLE_EXTENSIONS = /\.(png|jpe?g)$/i;
const EXECUTION_LIMIT = 25;

function guessContentType(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".jpeg") || key.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const minBytes = Math.max(50_000, Number(body?.minBytes ?? 250_000));
  const maxItems = Math.min(EXECUTION_LIMIT, Math.max(1, Number(body?.maxItems ?? 10)));
  const requestedKeys: string[] = Array.isArray(body?.keys)
    ? body.keys.filter((key: unknown): key is string => typeof key === "string" && key.trim().length > 0)
    : [];

  const objects = await listS3Objects();
  const candidatePool = objects
    .filter((item) => item.Key && COMPRESSIBLE_EXTENSIONS.test(item.Key))
    .map((item) => ({
      key: item.Key as string,
      sizeBytes: Number(item.Size ?? 0),
    }))
    .filter((item) => item.sizeBytes >= minBytes)
    .map((item) => ({
      ...item,
      estimatedSavedBytes: Math.floor(item.sizeBytes * 0.25),
    }));
  const poolByKey = new Map(candidatePool.map((item) => [item.key, item]));
  const candidates =
    requestedKeys.length > 0
      ? requestedKeys
          .map((key) => poolByKey.get(key))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : candidatePool;

  if (dryRun) {
    return NextResponse.json({
      dryRun,
      minBytes,
      candidateCount: candidates.length,
      estimatedSavedBytes: candidates.reduce((sum, item) => sum + item.estimatedSavedBytes, 0),
      candidates,
      note: "Assessment mode. Set dryRun=false to execute compression and overwrite optimized files.",
    });
  }

  const executionCandidates = candidates.slice(0, maxItems);
  const results: Array<{
    key: string;
    originalBytes: number;
    optimizedBytes: number;
    savedBytes: number;
    status: "optimized" | "skipped" | "failed";
    error?: string;
  }> = [];

  for (const candidate of executionCandidates) {
    try {
      const { buffer, contentType } = await getFromS3(candidate.key);
      const sourceType = (contentType || guessContentType(candidate.key)).toLowerCase();
      const processed = await processImage(buffer, sourceType, candidate.key);
      const optimizedBytes = processed.buffer.length;
      if (!optimizedBytes || optimizedBytes >= candidate.sizeBytes) {
        results.push({
          key: candidate.key,
          originalBytes: candidate.sizeBytes,
          optimizedBytes: optimizedBytes || candidate.sizeBytes,
          savedBytes: 0,
          status: "skipped",
        });
        continue;
      }
      await uploadToS3(candidate.key, processed.buffer, processed.contentType);
      results.push({
        key: candidate.key,
        originalBytes: candidate.sizeBytes,
        optimizedBytes,
        savedBytes: candidate.sizeBytes - optimizedBytes,
        status: "optimized",
      });
    } catch (error) {
      results.push({
        key: candidate.key,
        originalBytes: candidate.sizeBytes,
        optimizedBytes: candidate.sizeBytes,
        savedBytes: 0,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  const optimizedCount = results.filter((r) => r.status === "optimized").length;
  const savedBytesTotal = results.reduce((sum, r) => sum + r.savedBytes, 0);
  await auditLog({
    action: "media.optimize",
    resourceType: "media",
    resourceId: null,
    details: JSON.stringify({
      optimizedCount,
      attempted: executionCandidates.length,
      savedBytesTotal,
      minBytes,
      maxItems,
      requestedCount: requestedKeys.length || undefined,
      actor: auth.session.user?.email ?? auth.session.user?.name ?? "unknown",
    }),
    ip: request.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json({
    dryRun,
    minBytes,
    candidateCount: candidates.length,
    estimatedSavedBytes: candidates.reduce((sum, item) => sum + item.estimatedSavedBytes, 0),
    executed: executionCandidates.length,
    optimizedCount,
    savedBytesTotal,
    maxItems,
    requestedCount: requestedKeys.length || undefined,
    results,
    note:
      executionCandidates.length < candidates.length
        ? `Executed first ${executionCandidates.length} candidates. Increase maxItems to process more.`
        : "Compression run completed.",
  });
}

