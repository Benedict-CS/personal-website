import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_INTEGRATION_RETRY_POLICY, fetchWithRetry } from "@/lib/self-healing-fetch";

export const dynamic = "force-dynamic";

/**
 * Latest release metadata from PyPI (public JSON API, no token).
 * GET /api/integrations/pypi?package=requests
 */
function validPypiName(name: string): boolean {
  if (!name || name.length > 100) return false;
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("package")?.trim().toLowerCase() ?? "";
  if (!validPypiName(pkg)) {
    return NextResponse.json({ error: "Invalid package name" }, { status: 400 });
  }

  try {
    const res = await fetchWithRetry(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    }, EXTERNAL_INTEGRATION_RETRY_POLICY);

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Package not found" : "PyPI error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid PyPI response" }, { status: 502 });
    }

    const info = data.info as Record<string, unknown> | undefined;
    if (!info || typeof info !== "object") {
      return NextResponse.json({ error: "Invalid PyPI response" }, { status: 502 });
    }

    const name = typeof info.name === "string" ? info.name : pkg;
    const version = typeof info.version === "string" ? info.version : "";
    const summary = info.summary != null ? String(info.summary) : null;
    const license = info.license != null && String(info.license).trim() ? String(info.license) : null;

    return NextResponse.json(
      { name, version, description: summary, license },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/pypi]", e);
    return NextResponse.json({ error: "Failed to reach PyPI" }, { status: 502 });
  }
}
