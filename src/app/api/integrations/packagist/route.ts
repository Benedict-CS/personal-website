import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest stable-ish release metadata from Packagist (Composer).
 * GET /api/integrations/packagist?package=symfony/http-foundation
 */
function validComposerPackage(name: string): boolean {
  if (!name || name.length > 255) return false;
  return /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/i.test(name.trim());
}

type PackagistP2Response = {
  packages?: Record<string, Array<{ version?: string; description?: string; license?: string[] }>>;
};

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("package")?.trim() ?? "";
  if (!validComposerPackage(pkg)) {
    return NextResponse.json({ error: "Invalid package name (use vendor/package)" }, { status: 400 });
  }

  const key = pkg.toLowerCase();
  const url = `https://repo.packagist.org/p2/${encodeURIComponent(key)}.json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Package not found" : "Packagist error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: PackagistP2Response;
    try {
      data = (await res.json()) as PackagistP2Response;
    } catch {
      return NextResponse.json({ error: "Invalid Packagist response" }, { status: 502 });
    }

    const rows = data.packages?.[key];
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
    if (!row || typeof row.version !== "string" || !row.version) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const description =
      typeof row.description === "string" && row.description.trim() ? row.description.trim() : null;
    const license =
      Array.isArray(row.license) && row.license.length > 0 && typeof row.license[0] === "string"
        ? row.license[0]
        : null;

    return NextResponse.json(
      {
        name: key,
        version: row.version,
        description,
        license,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/packagist]", e);
    return NextResponse.json({ error: "Failed to reach Packagist" }, { status: 502 });
  }
}
