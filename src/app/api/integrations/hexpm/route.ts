import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Package metadata from Hex (Elixir).
 * GET /api/integrations/hexpm?package=ecto
 */
function validHexPackageName(name: string): boolean {
  if (!name || name.length > 255) return false;
  return /^[a-z][a-z0-9_]{0,254}$/.test(name);
}

type HexPackageResponse = {
  name?: string;
  latest_stable_version?: string | null;
  latest_version?: string | null;
  releases?: Array<{ version?: string }>;
  meta?: { description?: string; licenses?: string[] };
};

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("package")?.trim().toLowerCase() ?? "";
  if (!validHexPackageName(pkg)) {
    return NextResponse.json({ error: "Invalid package name" }, { status: 400 });
  }

  const url = `https://hex.pm/api/packages/${encodeURIComponent(pkg)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Package not found" : "Hex.pm error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: HexPackageResponse;
    try {
      data = (await res.json()) as HexPackageResponse;
    } catch {
      return NextResponse.json({ error: "Invalid Hex response" }, { status: 502 });
    }

    const name = typeof data.name === "string" && data.name ? data.name : pkg;
    let version =
      typeof data.latest_stable_version === "string" && data.latest_stable_version
        ? data.latest_stable_version
        : typeof data.latest_version === "string" && data.latest_version
          ? data.latest_version
          : "";
    if (!version && Array.isArray(data.releases) && data.releases.length > 0) {
      const v = data.releases[0]?.version;
      version = typeof v === "string" ? v : "";
    }
    if (!version) {
      return NextResponse.json({ error: "Invalid Hex response" }, { status: 502 });
    }

    const meta = data.meta;
    const description =
      meta && typeof meta.description === "string" && meta.description.trim()
        ? meta.description.trim()
        : null;
    const license =
      meta && Array.isArray(meta.licenses) && meta.licenses.length > 0 && typeof meta.licenses[0] === "string"
        ? meta.licenses[0]
        : null;

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
    console.error("[integrations/hexpm]", e);
    return NextResponse.json({ error: "Failed to reach Hex.pm" }, { status: 502 });
  }
}
