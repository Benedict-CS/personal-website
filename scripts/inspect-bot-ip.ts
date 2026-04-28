/**
 * Inspect remaining rows for a specific IP. Used after cleanup to confirm scanner traces are gone.
 * Usage: npx tsx scripts/inspect-bot-ip.ts 193.143.1.112
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const ip = process.argv[2];
  if (!ip) {
    console.error("Usage: tsx scripts/inspect-bot-ip.ts <ip>");
    process.exit(2);
  }
  const rows = await prisma.pageView.findMany({
    where: { ip },
    select: { id: true, path: true, userAgent: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`IP ${ip}: ${rows.length} row(s)`);
  for (const r of rows) {
    console.log(`  ${r.createdAt.toISOString()}  ${r.path}  UA=${(r.userAgent ?? "").slice(0, 80)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
