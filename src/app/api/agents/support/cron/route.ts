import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSupportAgent } from "@/lib/agents/support-agent";

export async function POST(request: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (request.headers.get("x-agent-cron-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sites = await prisma.tenantSite.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 200,
  });

  const results = [];
  for (const site of sites) {
    const result = await runSupportAgent(site.id);
    results.push({ siteId: site.id, ...result });
  }
  return NextResponse.json({ processed: results.length, results });
}

