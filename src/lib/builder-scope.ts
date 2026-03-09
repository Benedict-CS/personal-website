import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";

export type BuilderAuthContext = {
  ownerKey: string;
  siteScope: string;
};

export async function requireBuilderAuth(
  request: NextRequest
): Promise<{ context: BuilderAuthContext } | { unauthorized: Response }> {
  const auth = await requireSession();
  if ("unauthorized" in auth) return { unauthorized: auth.unauthorized };

  const ownerKey = auth.session.user?.email?.trim() || "admin@example.com";
  const rawScope = request.nextUrl.searchParams.get("siteScope")?.trim() || "default";
  const siteScope = normalizeSiteScope(rawScope);

  return { context: { ownerKey, siteScope } };
}

export function normalizeSiteScope(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "default";
}

