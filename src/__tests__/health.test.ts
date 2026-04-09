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
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, db: "ok" });
    expect(typeof result.body.uptimeSeconds).toBe("number");
    expect(result.body.node).toMatch(/^v\d+\./);
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
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ ok: false, db: "error" });
    expect(typeof result.body.uptimeSeconds).toBe("number");
  });

  it("includes appVersion from APP_VERSION when set", async () => {
    const prev = process.env.APP_VERSION;
    process.env.APP_VERSION = "1.2.3-test";
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
    try {
      const result = await runHealthCheck();
      expect(result.body.appVersion).toBe("1.2.3-test");
    } finally {
      if (prev === undefined) delete process.env.APP_VERSION;
      else process.env.APP_VERSION = prev;
    }
  });
});
