import { NextRequest, NextResponse } from "next/server";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";
import { runSupportAgent } from "@/lib/agents/support-agent";

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
  const result = await runSupportAgent(siteId);
  return NextResponse.json(result);
}

