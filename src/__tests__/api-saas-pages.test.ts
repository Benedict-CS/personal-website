import { NextRequest, NextResponse } from "next/server";
import { GET as GET_PAGES, POST as POST_PAGES } from "@/app/api/saas/sites/[siteId]/pages/route";
import { POST as PUBLISH_PAGE } from "@/app/api/saas/sites/[siteId]/pages/[pageId]/publish/route";

const mockPageFindMany = jest.fn();
const mockPageFindUnique = jest.fn();
const mockPageCreate = jest.fn();
const mockPageFindFirst = jest.fn();
const mockPageUpdate = jest.fn();
const mockPageVersionCreate = jest.fn();
const mockPageVersionFindFirst = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      findMany: (...args: unknown[]) => mockPageFindMany(...args),
      findUnique: (...args: unknown[]) => mockPageFindUnique(...args),
      create: (...args: unknown[]) => mockPageCreate(...args),
      findFirst: (...args: unknown[]) => mockPageFindFirst(...args),
      update: (...args: unknown[]) => mockPageUpdate(...args),
    },
    pageVersion: {
      create: (...args: unknown[]) => mockPageVersionCreate(...args),
      findFirst: (...args: unknown[]) => mockPageVersionFindFirst(...args),
    },
  },
}));

const mockRequireTenantContext = jest.fn();
const mockCanWrite = jest.fn();
jest.mock("@/lib/tenant-auth", () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args),
  canWrite: (...args: unknown[]) => mockCanWrite(...args),
}));

describe("SaaS page routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns tenant-scoped pages", async () => {
    mockRequireTenantContext.mockResolvedValue({
      context: { siteId: "site-1", role: "viewer", userId: "u1", email: "a@b.com" },
    });
    mockPageFindMany.mockResolvedValue([{ id: "p1", title: "Home", slug: "home" }]);

    const req = new NextRequest("http://localhost/api/saas/sites/site-1/pages");
    const res = await GET_PAGES(req, { params: Promise.resolve({ siteId: "site-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].id).toBe("p1");
    expect(mockPageFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: "site-1" } }));
  });

  it("POST rejects when user cannot write", async () => {
    mockRequireTenantContext.mockResolvedValue({
      context: { siteId: "site-1", role: "viewer", userId: "u1", email: "a@b.com" },
    });
    mockCanWrite.mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/saas/sites/site-1/pages", {
      method: "POST",
      body: JSON.stringify({ title: "Landing" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST_PAGES(req, { params: Promise.resolve({ siteId: "site-1" }) });
    expect(res.status).toBe(403);
  });

  it("publish endpoint copies draft to production tree", async () => {
    mockRequireTenantContext.mockResolvedValue({
      context: { siteId: "site-1", role: "editor", userId: "u1", email: "a@b.com" },
    });
    mockCanWrite.mockReturnValue(true);
    mockPageFindFirst.mockResolvedValue({
      id: "page-1",
      title: "Home",
      slug: "home",
      draftBlocks: [{ id: "b1", type: "MarketingHeroSimple", content: {}, styles: {} }],
      seoMetadata: {},
    });
    mockPageVersionFindFirst.mockResolvedValue({ versionNumber: 7 });
    mockPageUpdate.mockResolvedValue({ id: "page-1", status: "PUBLISHED" });
    mockPageVersionCreate.mockResolvedValue({ id: "v8" });

    const req = new NextRequest("http://localhost/api/saas/sites/site-1/pages/page-1/publish", { method: "POST" });
    const res = await PUBLISH_PAGE(req, { params: Promise.resolve({ siteId: "site-1", pageId: "page-1" }) });
    expect(res.status).toBe(200);
    expect(mockPageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED" }),
      })
    );
  });

  it("returns unauthorized response passthrough", async () => {
    mockRequireTenantContext.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new NextRequest("http://localhost/api/saas/sites/site-1/pages");
    const res = await GET_PAGES(req, { params: Promise.resolve({ siteId: "site-1" }) });
    expect(res.status).toBe(401);
  });
});

