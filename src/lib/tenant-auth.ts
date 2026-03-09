import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export type TenantContext = {
  userId: string;
  email: string;
  siteId: string;
  role: "owner" | "admin" | "editor" | "viewer";
};

type EnsureUserResult =
  | { user: { id: string; email: string; displayName: string } }
  | { unauthorized: NextResponse };

type TenantGuardOptions = {
  siteId?: string;
  allowViewer?: boolean;
};

function normalizeRole(value: string): TenantContext["role"] {
  if (value === "owner" || value === "admin" || value === "editor" || value === "viewer") return value;
  return "viewer";
}

export async function ensureSaasUser(): Promise<EnsureUserResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const email = session.user.email.trim().toLowerCase();
  const displayName = session.user.name?.trim() || email.split("@")[0] || "User";
  const fallbackHash = `session-only:${email}`;

  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName },
    create: {
      email,
      displayName,
      passwordHash: fallbackHash,
      role: "owner",
    },
  });

  return { user: { id: user.id, email: user.email, displayName: user.displayName } };
}

export async function requireTenantContext(
  request: NextRequest,
  options: TenantGuardOptions = {}
): Promise<{ context: TenantContext } | { unauthorized: NextResponse }> {
  const ensured = await ensureSaasUser();
  if ("unauthorized" in ensured) return { unauthorized: ensured.unauthorized };

  const { user } = ensured;
  const siteId =
    options.siteId ||
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    "";

  if (!siteId) {
    return {
      unauthorized: NextResponse.json({ error: "Missing siteId" }, { status: 400 }),
    };
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, siteId },
    select: { role: true },
  });
  if (!account) {
    return {
      unauthorized: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const role = normalizeRole(account.role);
  if (!options.allowViewer && role === "viewer") {
    return {
      unauthorized: NextResponse.json({ error: "Insufficient role" }, { status: 403 }),
    };
  }

  return {
    context: {
      userId: user.id,
      email: user.email,
      siteId,
      role,
    },
  };
}

export function canWrite(role: TenantContext["role"]): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canManageSite(role: TenantContext["role"]): boolean {
  return role === "owner" || role === "admin";
}

