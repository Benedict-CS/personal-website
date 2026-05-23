/**
 * Deletes non-human PageView rows: probe/scanner sessions, automated crawls,
 * unknown IP, junk paths, and forged UAs.
 *
 * Usage (repo root):
 *   npx tsx scripts/cleanup-junk-pageviews.ts
 *   npx tsx scripts/cleanup-junk-pageviews.ts --ip-prefix 140.113.194.
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { purgeNonHumanAnalytics } from "../src/lib/analytics-noise";

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
  const summary = await purgeNonHumanAnalytics(prisma);
  console.log("Non-human purge:", summary);

  const ipPrefixes = parseIpPrefixesFromArgv();
  for (const raw of ipPrefixes) {
    const sw = subnetWhereClause(raw);
    const matched = await prisma.pageView.count({ where: sw });
    const del = await prisma.pageView.deleteMany({ where: sw });
    console.log(`Subnet (${normalizeIpv4SubnetPrefix(raw)}): deleted ${del.count} row(s) (matched ${matched}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
