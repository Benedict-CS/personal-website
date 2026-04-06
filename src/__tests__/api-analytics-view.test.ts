import { NextRequest } from "next/server";

const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockPostFindFirst = jest.fn();
const mockPostUpdate = jest.fn();
const mockIsPrivateIP = jest.fn();
const mockIsExcludedIP = jest.fn();
const mockNormalizeIP = jest.fn();
const mockGetRequestOrigin = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pageView: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    post: {
      findFirst: (...args: unknown[]) => mockPostFindFirst(...args),
      update: (...args: unknown[]) => mockPostUpdate(...args),
    },
  },
}));

jest.mock("@/lib/is-private-url", () => ({
  isPrivateIP: (...args: unknown[]) => mockIsPrivateIP(...args),
}));

jest.mock("@/lib/analytics-excluded-ips", () => ({
  isExcludedIP: (...args: unknown[]) => mockIsExcludedIP(...args),
  normalizeIP: (...args: unknown[]) => mockNormalizeIP(...args),
}));

jest.mock("@/lib/get-request-origin", () => ({
  getRequestOrigin: (...args: unknown[]) => mockGetRequestOrigin(...args),
}));

async function loadRoute(secret?: string) {
  jest.resetModules();
  if (secret) process.env.ANALYTICS_SECRET = secret;
  else delete process.env.ANALYTICS_SECRET;
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.test";
  const mod = await import("@/app/api/analytics/view/route");
  return mod.POST;
}

describe("POST /api/analytics/view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPrivateIP.mockReturnValue(false);
    mockIsExcludedIP.mockReturnValue(false);
    mockNormalizeIP.mockImplementation((ip: string) => ip);
    mockGetRequestOrigin.mockReturnValue("https://site.test");
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "pv-1" });
    mockPostFindFirst.mockResolvedValue(null);
    mockPostUpdate.mockResolvedValue({});
  });

  it("returns 401 for disallowed origin", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: { origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify({ path: "/" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns excluded skip", async () => {
    mockIsExcludedIP.mockReturnValue(true);
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "8.8.8.8",
      },
      body: JSON.stringify({ path: "/a" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data).toEqual({ ok: true, skipped: "excluded" });
  });

  it("returns private_ip skip", async () => {
    mockIsPrivateIP.mockReturnValue(true);
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.10",
      },
      body: JSON.stringify({ path: "/a" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data).toEqual({ ok: true, skipped: "private_ip" });
  });

  it("returns dedup skip when recent record exists", async () => {
    mockFindFirst.mockResolvedValue({ id: "exists" });
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "8.8.4.4",
      },
      body: JSON.stringify({ path: "/same" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data).toEqual({ ok: true, skipped: "dedup" });
  });

  it("creates page view on valid request", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "3.3.3.3",
      },
      body: JSON.stringify({ path: "/ok" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockPostUpdate).not.toHaveBeenCalled();
  });

  it("increments post viewCount for published blog slug path", async () => {
    mockPostFindFirst.mockResolvedValue({ id: "post-1" });
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "3.3.3.3",
      },
      body: JSON.stringify({ path: "/blog/hello-world", referrer: "https://google.com/", userAgent: "TestAgent/1.0" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          path: "/blog/hello-world",
          referrer: "https://google.com/",
          userAgent: "TestAgent/1.0",
        }),
      })
    );
    expect(mockPostUpdate).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { viewCount: { increment: 1 } },
    });
  });

  it("accepts middleware-secret flow and bypasses origin check", async () => {
    const POST = await loadRoute("secret-1");
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        "x-analytics-secret": "secret-1",
        "content-type": "application/json",
      },
      body: JSON.stringify({ path: "/from-mw", ip: "11.22.33.44" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalled();
  });

  it("returns 500 when DB create fails", async () => {
    mockCreate.mockRejectedValue(new Error("db fail"));
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/view", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "4.4.4.4",
      },
      body: JSON.stringify({ path: "/err" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

