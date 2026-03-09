import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";
import { generateTenantDockerfile } from "@/lib/infra/dockerfile";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canManageSite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const site = await prisma.tenantSite.findUnique({
    where: { id: siteId },
    select: { slug: true },
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const imageTag = request.nextUrl.searchParams.get("imageTag") || `tenant-${siteId}:latest`;
  const dockerfile = generateTenantDockerfile(site.slug, imageTag);
  return new NextResponse(dockerfile, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

