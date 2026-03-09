import { prisma } from "@/lib/prisma";
import { getString, incrementWithExpiry, setString } from "@/lib/infra/redis";

export async function resolveTenantHost(host: string): Promise<{ siteId: string; slug: string } | null> {
  const normalized = host.toLowerCase();
  const cacheKey = `edge:domain:${normalized}`;
  const cached = await getString(cacheKey);
  if (cached) {
    const [siteId, slug] = cached.split("|");
    if (siteId && slug) return { siteId, slug };
  }

  const site = await prisma.tenantSite.findFirst({
    where: {
      OR: [{ customDomain: normalized }, { subdomain: normalized.split(".")[0] }],
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    select: { id: true, slug: true },
  });
  if (!site) return null;

  await setString(cacheKey, `${site.id}|${site.slug}`, 600);
  return { siteId: site.id, slug: site.slug };
}

export async function checkTenantRateLimit(siteId: string, ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const minuteLimit = Number(process.env.EDGE_RATE_LIMIT_PER_MINUTE || "120");
  const key = `edge:rl:${siteId}:${ip}:${new Date().toISOString().slice(0, 16)}`;
  const count = await incrementWithExpiry(key, 70);
  return {
    allowed: count <= minuteLimit,
    remaining: Math.max(0, minuteLimit - count),
  };
}

