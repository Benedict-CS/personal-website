/**
 * Delete all PageView rows for one or more IPs.
 * Usage: npx tsx scripts/delete-pageviews-by-ip.ts 1.2.3.4 5.6.7.8
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const ips = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
  if (ips.length === 0) {
    console.error("Usage: tsx scripts/delete-pageviews-by-ip.ts <ip> [<ip> ...]");
    process.exit(2);
  }
  const result = await prisma.pageView.deleteMany({ where: { ip: { in: ips } } });
  console.log(`Deleted ${result.count} PageView row(s) for IPs: ${ips.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
