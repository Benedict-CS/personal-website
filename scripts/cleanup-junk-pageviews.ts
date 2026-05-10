/**
 * Deletes PageView rows that match analytics noise rules (scanner paths, junk UAs).
 * Two passes:
 *   1) Path / UA-substring rules expressible in Prisma (deleteMany).
 *   2) Outdated/forged UA detection in JS (regex with version checks).
 * Optional: --ip-prefix <dotted> (repeatable), e.g. --ip-prefix 140.113.194. deletes that IPv4
 * subnet and ::ffff: forms. Trailing dot recommended.
 * Usage: from repo root:
 *   npx tsx scripts/cleanup-junk-pageviews.ts
 *   npx tsx scripts/cleanup-junk-pageviews.ts --ip-prefix 140.113.194.
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  isLikelyOutdatedFakeUserAgent,
  prismaWhereMatchAnalyticsNoise,
} from "../src/lib/analytics-noise";

const prisma = new PrismaClient({ log: ["error"] });

function normalizeIpv4SubnetPrefix(raw: string): string {
  let p = raw.trim();
  if (!p) return p;
  if (!p.endsWith(".") && /^\d{1,3}(\.\d{1,3}){2}$/.test(p)) p = `${p}.`;
  return p;
}

function subnetWhereClause(ipv4Prefix: string): Prisma.PageViewWhereInput {
  const p = normalizeIpv4SubnetPrefix(ipv4Prefix);
  const or: Prisma.PageViewWhereInput[] = [{ ip: { startsWith: p } }];
  if (/^\d/.test(p)) {
    or.push({ ip: { startsWith: `::ffff:${p}` } });
  }
  return { OR: or };
}

function parseIpPrefixesFromArgv(): string[] {
  const out: string[] = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ip-prefix" && argv[i + 1]) {
      out.push(argv[++i].trim());
    }
  }
  return out.filter(Boolean);
}

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

  const ipPrefixes = parseIpPrefixesFromArgv();
  for (const raw of ipPrefixes) {
    const sw = subnetWhereClause(raw);
    const matched = await prisma.pageView.count({ where: sw });
    const del = await prisma.pageView.deleteMany({ where: sw });
    console.log(`Pass subnet (${normalizeIpv4SubnetPrefix(raw)}): deleted ${del.count} row(s) (matched ${matched}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
