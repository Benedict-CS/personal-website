import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest gem metadata from RubyGems.org JSON API.
 * GET /api/integrations/rubygems?gem=rails
 */
function validGemName(name: string): boolean {
  if (!name || name.length > 191) return false;
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

type RubyGemsGemResponse = {
  name?: string;
  version?: string;
  info?: string;
  licenses?: string[];
};

export async function GET(request: NextRequest) {
  const gem = request.nextUrl.searchParams.get("gem")?.trim() ?? "";
  if (!validGemName(gem)) {
    return NextResponse.json({ error: "Invalid gem name" }, { status: 400 });
  }

  const url = `https://rubygems.org/api/v1/gems/${encodeURIComponent(gem)}.json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Gem not found" : "RubyGems error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: RubyGemsGemResponse;
    try {
      data = (await res.json()) as RubyGemsGemResponse;
    } catch {
      return NextResponse.json({ error: "Invalid RubyGems response" }, { status: 502 });
    }

    const name = typeof data.name === "string" && data.name ? data.name : gem;
    const version = typeof data.version === "string" ? data.version : "";
    if (!version) {
      return NextResponse.json({ error: "Invalid RubyGems response" }, { status: 502 });
    }

    const description =
      typeof data.info === "string" && data.info.trim() ? data.info.trim() : null;
    const license =
      Array.isArray(data.licenses) && data.licenses.length > 0 && typeof data.licenses[0] === "string"
        ? data.licenses[0]
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
    console.error("[integrations/rubygems]", e);
    return NextResponse.json({ error: "Failed to reach RubyGems" }, { status: 502 });
  }
}
