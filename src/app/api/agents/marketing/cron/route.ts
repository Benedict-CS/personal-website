import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMarketingAgent } from "@/lib/agents/marketing-agent";

export async function POST(request: Request) {
  const secret = process.env.AGENT_CRON_SECRET;
  const header = request.headers.get("x-agent-cron-secret");
  if (secret && header !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sites = await prisma.tenantSite.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 200,
  });

  const results = [];
  for (const site of sites) {
    const result = await runMarketingAgent(site.id);
    results.push({ siteId: site.id, ...result });
  }
  return NextResponse.json({ processed: results.length, results });
}

