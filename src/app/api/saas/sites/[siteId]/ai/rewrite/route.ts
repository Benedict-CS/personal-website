import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";
import { rewriteMarketingCopy } from "@/lib/saas/ai-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as { text?: string; tone?: "seo" | "formal" | "friendly" };
  const text = body.text?.trim();
  const tone = body.tone || "seo";
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const rewritten = rewriteMarketingCopy(text, tone);
  return NextResponse.json({ rewritten, tone });
}

