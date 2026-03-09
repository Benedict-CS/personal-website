import { NextRequest } from "next/server";
import { canManageSite, canWrite, ensureSaasUser, requireTenantContext } from "@/lib/tenant-auth";

const mockGetServerSession = jest.fn();
const mockUserUpsert = jest.fn();
const mockAccountFindFirst = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
    },
    account: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
  },
}));

describe("tenant-auth guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects when no authenticated session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = await ensureSaasUser();
    expect("unauthorized" in result).toBe(true);
  });

  it("creates/updates user from session and returns tenant context", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: "owner@example.com", name: "Owner" },
    });
    mockUserUpsert.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      displayName: "Owner",
    });
    mockAccountFindFirst.mockResolvedValue({ role: "editor" });

    const req = new NextRequest("http://localhost/api/saas/sites/abc/pages?siteId=site-1");
    const result = await requireTenantContext(req, { allowViewer: true });
    expect("context" in result).toBe(true);
    if ("context" in result) {
      expect(result.context.siteId).toBe("site-1");
      expect(result.context.role).toBe("editor");
    }
  });

  it("enforces strict tenant isolation for unknown site", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: "owner@example.com", name: "Owner" },
    });
    mockUserUpsert.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      displayName: "Owner",
    });
    mockAccountFindFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/saas/sites/private/pages?siteId=site-private");
    const result = await requireTenantContext(req, { allowViewer: true });
    expect("unauthorized" in result).toBe(true);
  });

  it("write and management permissions follow role model", () => {
    expect(canWrite("owner")).toBe(true);
    expect(canWrite("editor")).toBe(true);
    expect(canWrite("viewer")).toBe(false);
    expect(canManageSite("admin")).toBe(true);
    expect(canManageSite("editor")).toBe(false);
  });
});

