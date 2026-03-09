import { NextRequest, NextResponse } from "next/server";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";
import { queueAndDeployTenant } from "@/lib/infra/deployment-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canManageSite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    provider?: "docker" | "kubernetes";
    imageTag?: string;
    repoUrl?: string;
    customDomain?: string | null;
  };

  const provider = body.provider || "docker";
  const imageTag = body.imageTag?.trim() || `tenant-${siteId}:latest`;

  try {
    const result = await queueAndDeployTenant({
      siteId,
      provider,
      imageTag,
      repoUrl: body.repoUrl,
      customDomain: body.customDomain,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

