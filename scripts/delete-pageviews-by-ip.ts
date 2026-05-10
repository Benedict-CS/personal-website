/**
 * Delete all PageView rows for one or more IPs, or by IPv4 subnet prefix.
 * Usage:
 *   npx tsx scripts/delete-pageviews-by-ip.ts 1.2.3.4 5.6.7.8
 *   npx tsx scripts/delete-pageviews-by-ip.ts --prefix 140.113.194.
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

function normalizeIpv4SubnetPrefix(raw: string): string {
  let p = raw.trim();
  if (!p.endsWith(".") && /^\d{1,3}(\.\d{1,3}){2}$/.test(p)) p = `${p}.`;
  return p;
}

function subnetWhere(ipv4Prefix: string): Prisma.PageViewWhereInput {
  const p = normalizeIpv4SubnetPrefix(ipv4Prefix);
  const or: Prisma.PageViewWhereInput[] = [{ ip: { startsWith: p } }];
  if (/^\d/.test(p)) {
    or.push({ ip: { startsWith: `::ffff:${p}` } });
  }
  return { OR: or };
}

async function main() {
  const argv = process.argv.slice(2);
  const prefixes: string[] = [];
  const ips: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--prefix" && argv[i + 1]) {
      prefixes.push(argv[++i].trim());
      continue;
    }
    const t = argv[i].trim();
    if (t) ips.push(t);
  }
  if (prefixes.length === 0 && ips.length === 0) {
    console.error(
      "Usage: tsx scripts/delete-pageviews-by-ip.ts <ip> [<ip> ...] | --prefix <dotted.subnet.> [--prefix ...]"
    );
    process.exit(2);
  }
  let total = 0;
  for (const raw of prefixes) {
    const w = subnetWhere(raw);
    const r = await prisma.pageView.deleteMany({ where: w });
    total += r.count;
    console.log(`Prefix ${normalizeIpv4SubnetPrefix(raw)}: deleted ${r.count} row(s).`);
  }
  if (ips.length > 0) {
    const result = await prisma.pageView.deleteMany({ where: { ip: { in: ips } } });
    total += result.count;
    console.log(`Exact IPs ${ips.join(", ")}: deleted ${result.count} row(s).`);
  }
  console.log(`Total deleted: ${total} PageView row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
