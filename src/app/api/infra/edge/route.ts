import { NextRequest, NextResponse } from "next/server";
import { checkTenantRateLimit, resolveTenantHost } from "@/lib/infra/edge-control-plane";

export async function POST(request: NextRequest) {
  const secret = process.env.EDGE_CONTROL_SECRET;
  const headerSecret = request.headers.get("x-edge-control-secret");
  if (secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { host?: string; ip?: string };
  const host = body.host?.toLowerCase().trim();
  const ip = body.ip?.trim() || "unknown";
  if (!host) return NextResponse.json({ allowed: true });

  const tenant = await resolveTenantHost(host);
  if (!tenant) return NextResponse.json({ allowed: true });

  const rate = await checkTenantRateLimit(tenant.siteId, ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { allowed: false, reason: "Tenant rate limit exceeded", siteId: tenant.siteId, siteSlug: tenant.slug },
      { status: 429 }
    );
  }

  return NextResponse.json({
    allowed: true,
    siteId: tenant.siteId,
    siteSlug: tenant.slug,
    remaining: rate.remaining,
  });
}

