import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest tagged version via the Go module proxy (@latest).
 * GET /api/integrations/gomodule?module=github.com/gin-gonic/gin
 */
function validGoModulePath(path: string): boolean {
  if (path.length < 3 || path.length > 512) return false;
  if (path.includes("..") || path.includes("//")) return false;
  if (path.startsWith("/") || path.endsWith("/")) return false;
  if (!path.includes("/")) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._\-/]*$/.test(path);
}

type GoLatestResponse = {
  Version?: string;
  Time?: string;
};

export async function GET(request: NextRequest) {
  const modulePath = request.nextUrl.searchParams.get("module")?.trim() ?? "";
  if (!validGoModulePath(modulePath)) {
    return NextResponse.json({ error: "Invalid module path" }, { status: 400 });
  }

  const url = `https://proxy.golang.org/${modulePath}/@latest`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PersonalSite-GoProxyIntegration/1.0 (+https://proxy.golang.org)",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Module not found" : "Go proxy error" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    let data: GoLatestResponse;
    try {
      data = (await res.json()) as GoLatestResponse;
    } catch {
      return NextResponse.json({ error: "Invalid Go proxy response" }, { status: 502 });
    }

    const version = typeof data.Version === "string" && data.Version ? data.Version : "";
    if (!version) {
      return NextResponse.json({ error: "Invalid Go proxy response" }, { status: 502 });
    }

    const time = typeof data.Time === "string" && data.Time.trim() ? data.Time.trim() : null;
    const description = time ? `Released ${time} (proxy @latest)` : null;

    return NextResponse.json(
      { name: modulePath, version, description, license: null as string | null },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("[integrations/gomodule]", e);
    return NextResponse.json({ error: "Failed to reach Go module proxy" }, { status: 502 });
  }
}
