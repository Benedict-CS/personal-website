/**
 * Unit test for health check logic (mocked DB).
 */
import { runHealthCheck } from "@/lib/health";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

describe("runHealthCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ok when DB responds", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
    const result = await runHealthCheck();
    expect(result).toEqual({ body: { ok: true, db: "ok" }, status: 200 });
  });

  it("returns v1 version when passed", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
    const result = await runHealthCheck("v1");
    expect(result.body).toMatchObject({ ok: true, db: "ok", version: "v1" });
    expect(result.status).toBe(200);
  });

  it("returns 503 when DB throws", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("Connection refused"));
    const result = await runHealthCheck();
    expect(result).toEqual({ body: { ok: false, db: "error" }, status: 503 });
  });
});
