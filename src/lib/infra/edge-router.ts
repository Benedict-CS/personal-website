import type { NextRequest } from "next/server";
import { incrementWithExpiry, getString } from "@/lib/infra/redis";

export type EdgeRoutingResult = {
  allowed: boolean;
  siteId?: string;
  siteSlug?: string;
  reason?: string;
  statusCode?: number;
};

function parseHost(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

export async function resolveTenantByHost(host: string): Promise<{ siteId: string; slug: string } | null> {
  if (!host) return null;
  const cacheKey = `edge:domain:${host}`;
  const cached = await getString(cacheKey);
  if (cached) {
    const [siteId, slug] = cached.split("|");
    if (siteId && slug) return { siteId, slug };
  }
  return null;
}

export async function enforceTenantRateLimit(
  request: NextRequest,
  siteId: string
): Promise<EdgeRoutingResult> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const minuteLimit = Number(process.env.EDGE_RATE_LIMIT_PER_MINUTE || "120");
  const key = `edge:rl:${siteId}:${ip}:${new Date().toISOString().slice(0, 16)}`;
  const count = await incrementWithExpiry(key, 70);
  if (count > minuteLimit) {
    return {
      allowed: false,
      reason: "Rate limit exceeded for tenant",
      statusCode: 429,
    };
  }
  return { allowed: true, siteId };
}

export async function evaluateEdgeRouting(request: NextRequest): Promise<EdgeRoutingResult> {
  const host = parseHost(request);
  const tenant = await resolveTenantByHost(host);
  if (!tenant) {
    return { allowed: true };
  }
  const limit = await enforceTenantRateLimit(request, tenant.siteId);
  if (!limit.allowed) return limit;
  return { allowed: true, siteId: tenant.siteId, siteSlug: tenant.slug };
}

