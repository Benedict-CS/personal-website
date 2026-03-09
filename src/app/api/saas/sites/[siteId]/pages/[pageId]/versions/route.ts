import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const versions = await prisma.pageVersion.findMany({
    where: { siteId, pageId },
    orderBy: { versionNumber: "desc" },
    take: 100,
  });
  return NextResponse.json(versions);
}

