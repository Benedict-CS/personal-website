import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  findNonHumanVisitorIps,
  prismaWhereExcludeLocalAndUnknownIp,
  prismaWhereRealVisitorPageViews,
} from "../src/lib/analytics-noise";
import { prismaWhereQualifiedPageView } from "../src/lib/analytics-qualified-visit";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const baseWhere = {
    createdAt: {
      gte: new Date("2026-01-01T00:00:00"),
      lte: new Date("2026-05-23T23:59:59.999"),
    },
  };

  const total = await prisma.pageView.count({ where: baseWhere });
  const nonHuman = await findNonHumanVisitorIps(prisma, baseWhere);
  const where = {
    AND: [
      baseWhere,
      prismaWhereRealVisitorPageViews(),
      prismaWhereExcludeLocalAndUnknownIp(),
      prismaWhereQualifiedPageView(),
      { NOT: { ip: { in: nonHuman } } },
    ],
  };

  const filtered = await prisma.pageView.count({ where });
  const visitors = await prisma.pageView.groupBy({
    by: ["ip"],
    where,
    _count: { ip: true },
  });
  const linkedin = await prisma.pageView.count({
    where: { AND: [where, { referrer: { contains: "linkedin", mode: "insensitive" } }] },
  });

  console.log("Raw rows in date range:", total);
  console.log("Non-human IPs excluded:", nonHuman.length, nonHuman.slice(0, 15));
  console.log("After all filters — page views:", filtered);
  console.log("After all filters — visitors:", visitors.length);
  console.log("LinkedIn rows after filters:", linkedin);
  console.log(
    "Visitor IPs:",
    visitors.map((v) => `${v.ip}(${v._count.ip})`).join(", ")
  );

  // Break down exclusions
  const afterReal = await prisma.pageView.count({
    where: { AND: [baseWhere, prismaWhereRealVisitorPageViews(), prismaWhereExcludeLocalAndUnknownIp()] },
  });
  const afterQualified = await prisma.pageView.count({
    where: {
      AND: [
        baseWhere,
        prismaWhereRealVisitorPageViews(),
        prismaWhereExcludeLocalAndUnknownIp(),
        prismaWhereQualifiedPageView(),
      ],
    },
  });
  console.log("\nBreakdown:");
  console.log("  after bot/junk path filter:", afterReal);
  console.log("  after homepage bounce filter:", afterQualified);
  console.log("  removed by non-human IP list:", afterQualified - filtered);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
