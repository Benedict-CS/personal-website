import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";
import { isPlatformLocale } from "@/i18n/platform";

/**
 * Updates storefront default language (BCP 47) for html lang and builder defaults.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as { defaultLocale?: string };
  const raw = body.defaultLocale?.trim();
  if (!raw || !isPlatformLocale(raw)) {
    return NextResponse.json({ error: "Invalid defaultLocale" }, { status: 400 });
  }

  await prisma.tenantSite.update({
    where: { id: siteId },
    data: { defaultLocale: raw },
  });

  return NextResponse.json({ ok: true, defaultLocale: raw });
}
