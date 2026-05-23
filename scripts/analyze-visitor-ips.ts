import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const groups = await prisma.pageView.groupBy({
    by: ["ip"],
    _count: { ip: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
    orderBy: { _count: { ip: "desc" } },
  });
  for (const g of groups.filter((x) => x._count.ip >= 5)) {
    const span = (g._max.createdAt!.getTime() - g._min.createdAt!.getTime()) / 1000;
    const tags = await prisma.pageView.count({
      where: { ip: g.ip, path: { startsWith: "/blog/tag/" } },
    });
    console.log(`${g.ip}\tviews=${g._count.ip}\tspan_s=${span.toFixed(0)}\ttags=${tags}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
