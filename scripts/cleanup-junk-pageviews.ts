/**
 * Deletes PageView rows that match analytics noise rules (scanner paths, junk UAs).
 * Two passes:
 *   1) Path / UA-substring rules expressible in Prisma (deleteMany).
 *   2) Outdated/forged UA detection in JS (regex with version checks).
 * Usage: from repo root, with DATABASE_URL set:
 *   npx tsx scripts/cleanup-junk-pageviews.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  isLikelyOutdatedFakeUserAgent,
  prismaWhereMatchAnalyticsNoise,
} from "../src/lib/analytics-noise";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const where = prismaWhereMatchAnalyticsNoise();
  const before = await prisma.pageView.count({ where });
  const pathPass = await prisma.pageView.deleteMany({ where });
  console.log(`Pass 1 (path/UA-substring): deleted ${pathPass.count} row(s) (matched ${before}).`);

  const candidates = await prisma.pageView.findMany({
    where: { userAgent: { not: null } },
    select: { id: true, userAgent: true },
  });
  const fakeUaIds = candidates.filter((r) => isLikelyOutdatedFakeUserAgent(r.userAgent)).map((r) => r.id);
  if (fakeUaIds.length > 0) {
    const uaPass = await prisma.pageView.deleteMany({ where: { id: { in: fakeUaIds } } });
    console.log(`Pass 2 (outdated/forged UA): deleted ${uaPass.count} row(s).`);
  } else {
    console.log("Pass 2 (outdated/forged UA): nothing to delete.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
