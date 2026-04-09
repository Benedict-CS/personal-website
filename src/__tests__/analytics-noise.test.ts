import { prismaWhereExcludeLocalAndUnknownIp, prismaWhereExcludeNoise } from "@/lib/analytics-noise";

describe("prismaWhereExcludeLocalAndUnknownIp", () => {
  it("excludes unknown, loopback, and private IPv4 prefixes", () => {
    const w = prismaWhereExcludeLocalAndUnknownIp();
    const and = (w as { AND?: unknown[] }).AND;
    expect(Array.isArray(and)).toBe(true);
    expect(and).toEqual(
      expect.arrayContaining([
        { ip: { not: "unknown" } },
        { ip: { not: "127.0.0.1" } },
        { NOT: { ip: { startsWith: "10." } } },
        { NOT: { ip: { startsWith: "192.168." } } },
        { NOT: { ip: { startsWith: "172.16." } } },
        { NOT: { ip: { startsWith: "172.31." } } },
        { NOT: { ip: { startsWith: "::ffff:10." } } },
      ])
    );
  });
});

describe("prismaWhereExcludeNoise", () => {
  it("requires non-null userAgent for scanner UA clauses so NULL UA rows are not excluded", () => {
    const w = prismaWhereExcludeNoise();
    const notClause = w.NOT as { OR?: unknown[] } | undefined;
    const ors = notClause?.OR;
    expect(Array.isArray(ors)).toBe(true);
    const uaScannerClauses = (ors as unknown[]).filter(
      (item): item is { AND: unknown[] } =>
        !!item &&
        typeof item === "object" &&
        "AND" in (item as object) &&
        Array.isArray((item as { AND: unknown[] }).AND)
    );
    expect(uaScannerClauses.length).toBeGreaterThan(0);
    const first = uaScannerClauses[0].AND;
    expect(first).toEqual(
      expect.arrayContaining([{ userAgent: { not: null } }, expect.objectContaining({ userAgent: expect.anything() })])
    );
  });
});
