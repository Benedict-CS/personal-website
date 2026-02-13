import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST: set order of custom pages by array of ids (dashboard only) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id: unknown): id is string => typeof id === "string") : [];
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
  }
  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.customPage.update({ where: { id }, data: { order: index } })
    )
  );
  return NextResponse.json({ ok: true });
}
