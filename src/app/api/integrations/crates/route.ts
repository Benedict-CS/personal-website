import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest crate metadata from crates.io (public JSON API).
 * GET /api/integrations/crates?crate=serde
 */
function validCrateName(name: string): boolean {
  if (!name || name.length > 64) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name);
}

export async function GET(request: NextRequest) {
  const crate = request.nextUrl.searchParams.get("crate")?.trim() ?? "";
  if (!validCrateName(crate)) {
    return NextResponse.json({ error: "Invalid crate name" }, { status: 400 });
  }

  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PersonalSite-CratesIntegration/1.0 (https://crates.io/policies)",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Crate not found" : "crates.io error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid crates.io response" }, { status: 502 });
    }

    const c = data.crate as Record<string, unknown> | undefined;
    if (!c || typeof c !== "object") {
      return NextResponse.json({ error: "Invalid crates.io response" }, { status: 502 });
    }

    const name = typeof c.id === "string" ? c.id : crate;
    const version =
      typeof c.max_stable_version === "string" && c.max_stable_version
        ? c.max_stable_version
        : typeof c.max_version === "string"
          ? c.max_version
          : "";
    const description = c.description != null ? String(c.description) : null;

    return NextResponse.json(
      { name, version, description, license: null as string | null },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/crates]", e);
    return NextResponse.json({ error: "Failed to reach crates.io" }, { status: 502 });
  }
}
