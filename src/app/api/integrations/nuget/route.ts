import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest stable package metadata via NuGet Search API (exact package id).
 * GET /api/integrations/nuget?package=Newtonsoft.Json
 */
function validNuGetId(id: string): boolean {
  if (!id || id.length > 128) return false;
  return /^[A-Za-z0-9._-]+$/.test(id);
}

type NuGetSearchResponse = {
  data?: Array<{
    id?: string;
    version?: string;
    description?: string;
    title?: string;
  }>;
};

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("package")?.trim() ?? "";
  if (!validNuGetId(pkg)) {
    return NextResponse.json({ error: "Invalid package id" }, { status: 400 });
  }

  const url = `https://azuresearch-usnc.nuget.org/query?q=packageid:${encodeURIComponent(pkg)}&prerelease=false&take=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "NuGet search error" }, { status: 502 });
    }

    let body: NuGetSearchResponse;
    try {
      body = (await res.json()) as NuGetSearchResponse;
    } catch {
      return NextResponse.json({ error: "Invalid NuGet response" }, { status: 502 });
    }

    const row = body.data?.[0];
    if (!row || typeof row.version !== "string" || !row.version) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const name = typeof row.id === "string" && row.id ? row.id : pkg;
    const description =
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : typeof row.title === "string" && row.title.trim()
          ? row.title.trim()
          : null;

    return NextResponse.json(
      {
        name,
        version: row.version,
        description,
        license: null as string | null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/nuget]", e);
    return NextResponse.json({ error: "Failed to reach NuGet" }, { status: 502 });
  }
}
