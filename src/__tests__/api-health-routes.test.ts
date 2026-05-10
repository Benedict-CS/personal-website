/**
 * Readiness routes: HEAD mirrors GET status; responses must not be cached by proxies.
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { GET as healthGet, HEAD as healthHead } from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";

describe("/api/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 200 and no-store when DB is up", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
    const res = await healthGet();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok" });
  });

  it("HEAD returns same status as GET without a body", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
    const res = await healthHead();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).toBe("");
  });

  it("GET and HEAD return 503 when DB fails", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("down"));
    const getRes = await healthGet();
    const headRes = await healthHead();
    expect(getRes.status).toBe(503);
    expect(headRes.status).toBe(503);
  });
});
