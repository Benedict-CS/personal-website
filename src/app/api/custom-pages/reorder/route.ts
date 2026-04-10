import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateSiteConfigRenderCache } from "@/lib/site-config";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";

/** POST: set order of custom pages by array of ids (dashboard only) */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const ip = getClientIP(request);
  const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "custom_pages_write");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many custom page updates. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
          "Cache-Control": "no-store, private",
        },
      }
    );
  }
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
  return NextResponse.json(
    { ok: true },
    {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    }
  );
}
