import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCustomPagePreviewToken } from "@/lib/custom-page-preview";
import { auditLog } from "@/lib/audit";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const ip = getClientIP(request);
  const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "custom_page_preview_token");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many preview-link requests. Please retry in a minute." },
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

  const { id } = await params;
  const page = await prisma.customPage.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const ttlSeconds = Number(body?.ttlSeconds ?? 60 * 60 * 24);
  const token = createCustomPagePreviewToken(id, ttlSeconds);
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const previewUrl = `${base}/page/preview?token=${encodeURIComponent(token)}`;

  await auditLog({
    action: "custom_page.update",
    resourceType: "custom_page",
    resourceId: id,
    details: JSON.stringify({
      type: "preview_link_generated",
      slug: page.slug,
      actor: auth.session.user?.email ?? auth.session.user?.name ?? "unknown",
      ttlSeconds,
    }),
    ip: request.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json(
    { previewUrl, token },
    { headers: { "X-RateLimit-Remaining": String(remaining) } }
  );
}

