import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateSiteConfigRenderCache } from "@/lib/site-config";

/** POST: set order of custom pages by array of ids (dashboard only) */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const body = await request.json();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id: unknown): id is string => typeof id === "string") : [];
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
  }
  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.customPage.update({ where: { id }, data: { order: index } })
    )
  );
  revalidateSiteConfigRenderCache();
  return NextResponse.json({ ok: true });
}
