import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest dist-tag metadata from the public npm registry (no token).
 * GET /api/integrations/npm?package=next
 * Scoped: ?package=@vercel/analytics
 */
function validPackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  if (name.startsWith("@")) {
    const i = name.indexOf("/");
    if (i <= 1 || i === name.length - 1) return false;
    const scope = name.slice(1, i);
    const base = name.slice(i + 1);
    return /^[a-z0-9._-]+$/i.test(scope) && /^[a-z0-9._-]+$/i.test(base);
  }
  return /^[a-z0-9._-]+$/i.test(name);
}

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("package")?.trim() ?? "";
  if (!validPackageName(pkg)) {
    return NextResponse.json({ error: "Invalid package name" }, { status: 400 });
  }

  const path = encodeURIComponent(pkg);

  try {
    const res = await fetch(`https://registry.npmjs.org/${path}/latest`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Package not found" : "npm registry error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid npm response" }, { status: 502 });
    }

    const name = typeof data.name === "string" ? data.name : pkg;
    const version = typeof data.version === "string" ? data.version : "";
    const description = data.description != null ? String(data.description) : null;
    let license: string | null = null;
    if (typeof data.license === "string") {
      license = data.license;
    } else if (data.license && typeof data.license === "object") {
      const t = (data.license as { type?: string }).type;
      license = typeof t === "string" ? t : null;
    }

    return NextResponse.json(
      { name, version, description, license },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/npm]", e);
    return NextResponse.json({ error: "Failed to reach npm registry" }, { status: 502 });
  }
}
